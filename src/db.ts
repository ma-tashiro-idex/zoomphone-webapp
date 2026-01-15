// Database utility functions for D1
import type { Deal, License, DealWithLicenses, DealCreateInput, DealUpdateInput, DashboardStats, Env } from './types';

/**
 * 年度フィルタリング用のヘルパー関数
 * 日本の会計年度（4月始まり）でフィルタ
 */
function filterByFiscalYear(deals: DealWithLicenses[], fiscalYear: number): DealWithLicenses[] {
  const fiscalStartDate = `${fiscalYear}-04-01`;
  const fiscalEndDate = `${fiscalYear + 1}-03-31`;
  
  return deals.filter(deal => {
    // 成約案件: closed_dateで判定
    if (deal.status === '成約' && deal.closed_date) {
      return deal.closed_date >= fiscalStartDate && deal.closed_date <= fiscalEndDate;
    }
    // 見込み案件: updated_atで判定
    if (deal.status === '見込み') {
      const updatedDate = deal.updated_at.split('T')[0]; // YYYY-MM-DD形式に変換
      return updatedDate >= fiscalStartDate && updatedDate <= fiscalEndDate;
    }
    return false;
  });
}

/**
 * Get all deals with their licenses
 */
export async function getAllDeals(db: D1Database, fiscalYear?: number): Promise<DealWithLicenses[]> {
  // Get all deals
  const dealsResult = await db.prepare(`
    SELECT * FROM deals ORDER BY updated_at DESC
  `).all<Deal>();

  if (!dealsResult.results || dealsResult.results.length === 0) {
    return [];
  }

  // Get all licenses
  const licensesResult = await db.prepare(`
    SELECT * FROM licenses
  `).all<License>();

  // Combine deals with their licenses
  let dealsWithLicenses: DealWithLicenses[] = dealsResult.results.map(deal => ({
    ...deal,
    licenses: licensesResult.results?.filter(l => l.deal_id === deal.id) || []
  }));

  // Apply fiscal year filter if specified
  if (fiscalYear) {
    dealsWithLicenses = filterByFiscalYear(dealsWithLicenses, fiscalYear);
  }

  return dealsWithLicenses;
}

/**
 * Get a single deal by customer name
 */
export async function getDealByCustomerName(db: D1Database, customerName: string): Promise<DealWithLicenses | null> {
  const dealResult = await db.prepare(`
    SELECT * FROM deals WHERE customer_name = ?
  `).bind(customerName).first<Deal>();

  if (!dealResult) {
    return null;
  }

  const licensesResult = await db.prepare(`
    SELECT * FROM licenses WHERE deal_id = ?
  `).bind(dealResult.id).all<License>();

  return {
    ...dealResult,
    licenses: licensesResult.results || []
  };
}

/**
 * Create a new deal with licenses
 */
export async function createDeal(db: D1Database, input: DealCreateInput): Promise<DealWithLicenses> {
  // Check if customer already exists
  const existing = await getDealByCustomerName(db, input.customer_name);
  if (existing) {
    throw new Error(`顧客「${input.customer_name}」は既に登録されています`);
  }

  // Insert deal
  const dealResult = await db.prepare(`
    INSERT INTO deals (customer_name, sales_rep, status, closed_date, source)
    VALUES (?, ?, ?, ?, ?)
    RETURNING *
  `).bind(
    input.customer_name,
    input.sales_rep,
    input.status,
    input.closed_date || null,
    input.source || 'manual'
  ).first<Deal>();

  if (!dealResult) {
    throw new Error('案件の登録に失敗しました');
  }

  // Insert licenses
  const licenses: License[] = [];
  for (const license of input.licenses) {
    const licenseResult = await db.prepare(`
      INSERT INTO licenses (deal_id, license_type, license_count)
      VALUES (?, ?, ?)
      RETURNING *
    `).bind(
      dealResult.id,
      license.license_type,
      license.license_count
    ).first<License>();

    if (licenseResult) {
      licenses.push(licenseResult);
    }
  }

  return {
    ...dealResult,
    licenses
  };
}

/**
 * Update an existing deal
 */
export async function updateDeal(db: D1Database, input: DealUpdateInput): Promise<DealWithLicenses> {
  // Update deal
  const dealResult = await db.prepare(`
    UPDATE deals 
    SET customer_name = ?, sales_rep = ?, status = ?, closed_date = ?, updated_at = datetime('now')
    WHERE id = ?
    RETURNING *
  `).bind(
    input.customer_name,
    input.sales_rep,
    input.status,
    input.closed_date || null,
    input.id
  ).first<Deal>();

  if (!dealResult) {
    throw new Error('案件が見つかりません');
  }

  // Delete old licenses
  await db.prepare(`
    DELETE FROM licenses WHERE deal_id = ?
  `).bind(input.id).run();

  // Insert new licenses
  const licenses: License[] = [];
  for (const license of input.licenses) {
    const licenseResult = await db.prepare(`
      INSERT INTO licenses (deal_id, license_type, license_count)
      VALUES (?, ?, ?)
      RETURNING *
    `).bind(
      dealResult.id,
      license.license_type,
      license.license_count
    ).first<License>();

    if (licenseResult) {
      licenses.push(licenseResult);
    }
  }

  return {
    ...dealResult,
    licenses
  };
}

/**
 * Delete a deal by customer name
 */
export async function deleteDeal(db: D1Database, customerName: string): Promise<boolean> {
  const result = await db.prepare(`
    DELETE FROM deals WHERE customer_name = ?
  `).bind(customerName).run();

  return result.success;
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(db: D1Database, fiscalYear?: number, filter?: '見込み' | '成約'): Promise<DashboardStats> {
  const deals = await getAllDeals(db, fiscalYear);

  let filteredDeals = deals;
  if (filter) {
    filteredDeals = deals.filter(d => d.status === filter);
  }

  // Calculate totals
  const confirmedLicenses = deals
    .filter(d => d.status === '成約')
    .reduce((sum, deal) => sum + deal.licenses.reduce((s, l) => s + l.license_count, 0), 0);

  const prospectLicenses = deals
    .filter(d => d.status === '見込み')
    .reduce((sum, deal) => sum + deal.licenses.reduce((s, l) => s + l.license_count, 0), 0);

  const totalLicenses = confirmedLicenses + prospectLicenses;
  const target = 1000;
  const achievementRate = Math.round((totalLicenses / target) * 100);
  const remainingTarget = Math.max(0, target - confirmedLicenses);

  // Half-year breakdown (fiscal year: April - March)
  const firstHalf = { confirmed: 0, prospect: 0, total: 0 };
  const secondHalf = { confirmed: 0, prospect: 0, total: 0 };

  deals.forEach(deal => {
    const date = new Date(deal.deal_date);
    const month = date.getMonth() + 1; // 1-12
    const isFirstHalf = month >= 4 && month <= 9;
    const licenseCount = deal.licenses.reduce((sum, l) => sum + l.license_count, 0);

    if (isFirstHalf) {
      if (deal.status === '成約') {
        firstHalf.confirmed += licenseCount;
      } else {
        firstHalf.prospect += licenseCount;
      }
      firstHalf.total += licenseCount;
    } else {
      if (deal.status === '成約') {
        secondHalf.confirmed += licenseCount;
      } else {
        secondHalf.prospect += licenseCount;
      }
      secondHalf.total += licenseCount;
    }
  });

  // License type breakdown
  const licenseBreakdown = {
    '無制限(0ABJ)': 0,
    '無制限(050)': 0,
    '従量制': 0,
    '内線のみ': 0
  };

  filteredDeals.forEach(deal => {
    deal.licenses.forEach(license => {
      licenseBreakdown[license.license_type] += license.license_count;
    });
  });

  return {
    total_licenses: totalLicenses,
    confirmed_licenses: confirmedLicenses,
    prospect_licenses: prospectLicenses,
    achievement_rate: achievementRate,
    remaining_target: remainingTarget,
    deal_count: filteredDeals.length,
    first_half: firstHalf,
    second_half: secondHalf,
    license_breakdown: licenseBreakdown
  };
}

/**
 * Check if user email is allowed
 */
export async function isEmailAllowed(db: D1Database, email: string): Promise<boolean> {
  const result = await db.prepare(`
    SELECT id FROM users WHERE email = ? AND is_active = 1
  `).bind(email).first();

  return result !== null;
}
