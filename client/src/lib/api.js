// lib/api.js

/**
 * Build a normalized HTTP error object.
 *
 * @param {Response} response
 * @param {any} data
 * @param {string|null} rawText
 * @returns {Error}
 */
const buildHttpError = (response, data, rawText = null) => {
  const message =
    (data && typeof data === "object" && data.message) ||
    (data && typeof data === "object" && data.error) ||
    `http_${response.status}`;

  const error = new Error(message);
  error.status = response.status;
  error.data = data;
  error.rawText = rawText;

  return error;
};

/**
 * Parse a fetch Response object safely.
 * Throws an error if response.ok is false, otherwise returns parsed JSON.
 *
 * @param {Response} response
 * @returns {Promise<any>}
 * @throws {Error}
 */
const parse = async (response) => {
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw buildHttpError(response, data, text || null);
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
 * @param {string} path
 * @param {Object} options
 * @returns {Promise<any>}
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
 * @param {string} path
 * @param {any} body
 * @param {Object} options
 * @returns {Promise<any>}
 */
export const apiPost = async (path, body, options = {}) => {
  const response = await fetch(path, {
    method: "POST",
    ...options,
    headers: withJsonHeaders({
      "Content-Type": "application/json",
      ...options.headers
    }),
    body: JSON.stringify(body ?? {})
  });

  return parse(response);
};

/**
 * Perform a DELETE request to the given path.
 *
 * @param {string} path
 * @param {Object} options
 * @returns {Promise<any>}
 */
export const apiDelete = async (path, options = {}) => {
  const response = await fetch(path, {
    method: "DELETE",
    ...options,
    headers: withJsonHeaders(options.headers)
  });

  return parse(response);
};

export default {
  apiGet,
  apiPost,
  apiDelete
};