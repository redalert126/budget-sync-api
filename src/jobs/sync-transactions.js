// Day 2: implement with /transactions/sync and its cursor.
//
// Requirements to hold yourself to (and to be able to explain in an interview):
// 1. Load the plaid_items row FOR UPDATE inside a transaction, so two workers can't
//    sync the same item at once and race on the cursor.
// 2. Decrypt the access token only in memory (src/lib/crypto.js). Never log it.
// 3. Page through `has_more`, applying added / modified / removed:
//      added + modified -> INSERT ... ON CONFLICT (plaid_transaction_id) DO UPDATE  (idempotent)
//      removed          -> SET removed_at = now()                                   (soft delete)
//    Convert Plaid's decimal `amount` to integer cents with Math.round(amount * 100).
// 4. Save the new cursor in the SAME transaction as the rows. If the job crashes
//    halfway, nothing commits and the retry starts from the old cursor.
// 5. If Plaid returns ITEM_LOGIN_REQUIRED, set status = 'login_required' and stop
//    retrying (throw UnrecoverableError from bullmq) instead of burning retries.
// 6. If Plaid returns TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION, restart from
//    the cursor you started with.
export async function syncTransactions({ db, plaid, encryptionKey, logger }, { plaidItemId }) {
  void db;
  void plaid;
  void encryptionKey;
  logger.warn({ plaidItemId }, 'syncTransactions not implemented yet');
}
