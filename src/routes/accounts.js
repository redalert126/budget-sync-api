import { Router } from 'express';

export function accountRoutes({ db }) {
  const router = Router();

  // Every query is scoped by req.userId: a user can only ever see their own rows.
  router.get('/', async (req, res) => {
    const { rows } = await db.query(
      `SELECT a.id, a.name, a.mask, a.type, a.subtype,
              a.current_balance_cents, a.iso_currency_code,
              p.institution_name, p.status AS connection_status
         FROM accounts a
         JOIN plaid_items p ON p.id = a.plaid_item_id
        WHERE a.user_id = $1
        ORDER BY p.institution_name, a.name`,
      [req.userId],
    );
    res.json({ data: rows });
  });

  return router;
}
