// utils/api.js

/**
 * Parse a fetch Response object safely.
 * Throws an error if response.ok is false, otherwise returns parsed JSON.
 *
 * @param {Response} response - fetch response
 * @returns {Promise<any>} parsed JSON data
 * @throws {Error} if response.ok is false
 */
const parse = async (response) => {
  const txt = await response.text();
  let data = null;

  try {
    data = txt ? JSON.parse(txt) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const msg = (data && data.message) || `http_${response.status}`;
    const error = new Error(msg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

const withJsonHeaders = (headers = {}) => ({
  Accept: "application/json",
  ...headers
});

/**
 * Perform a GET request to the given path.
 *
 * @param {string} path - endpoint path
 * @param {Object} options - fetch options
 * @returns {Promise<any>} parsed JSON
 */
export const apiGet = async (path, options = {}) => {
  const response = await fetch(path, {
    method: "GET",
    cache: "no-store",
    ...options,
    headers: withJsonHeaders(options.headers)
  });
  return parse(response);
};

/**
 * Perform a POST request to the given path with JSON body.
 *
 * @param {string} path - endpoint path
 * @param {Object} body - JSON body
 * @param {Object} options - fetch options
 * @returns {Promise<any>} parsed JSON
 */
export const apiPost = async (path, body, options = {}) => {
  const response = await fetch(path, {
    method: "POST",
    ...options,
    headers: withJsonHeaders({
      "Content-Type": "application/json",
      ...options.headers
    }),
    body: JSON.stringify(body || {}),
  });
  return parse(response);
};
