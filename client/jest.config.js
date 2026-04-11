export default {
  testEnvironment: "jsdom",

  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest"
  },

  moduleFileExtensions: ["js", "jsx", "ts", "tsx"],

  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy"
  }
};
