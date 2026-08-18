/**
 * Escapes regex metacharacters in user search queries
 * to prevent ReDoS and regex syntax errors in MongoDB $regex queries.
 */
export const escapeRegex = (str: string): string => {
  if (!str) return "";
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};
