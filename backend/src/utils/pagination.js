const { Op } = require('sequelize');

/**
 * Standard pagination parser used by every paginated list endpoint.
 *
 *   page    >= 1
 *   limit   1..100
 *   sort_by     — must appear in `allowedSortColumns` to avoid SQL injection
 *   sort_order  — 'ASC' | 'DESC' (default DESC)
 *   search      — substring matched (ILIKE) against `searchableColumns`
 */
function getPaginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  const search = (query.search || '').trim();
  const sort_by = query.sort_by || 'createdAt';
  const sort_order = (query.sort_order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return { page, limit, offset, search, sort_by, sort_order };
}

/**
 * Build a Sequelize `where` clause from `search` against the given list of
 * string columns. Returns `{}` when no search term was provided.
 */
function buildSearchWhere(search, searchableColumns) {
  if (!search || !searchableColumns || searchableColumns.length === 0) return {};
  return {
    [Op.or]: searchableColumns.map((col) => ({ [col]: { [Op.iLike]: `%${search}%` } }))
  };
}

/**
 * Run a paginated findAndCountAll on a Sequelize model and return the standard
 * `{ data, total, page, totalPages }` envelope every paginated frontend expects.
 */
async function paginate(Model, query, { searchable = [], allowedSort = ['id', 'createdAt'], extraWhere = {} } = {}) {
  const { page, limit, offset, search, sort_by, sort_order } = getPaginationParams(query);
  const sortCol = allowedSort.includes(sort_by) ? sort_by : (allowedSort[0] || 'createdAt');
  const where = { ...extraWhere, ...buildSearchWhere(search, searchable) };

  const { count, rows } = await Model.findAndCountAll({
    where,
    order: [[sortCol, sort_order]],
    limit,
    offset
  });

  return {
    data: rows,
    total: count,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(count / limit))
  };
}

module.exports = { getPaginationParams, buildSearchWhere, paginate };
