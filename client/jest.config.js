export default {
  testEnvironment: "jsdom",

  // JSX / ES Modules via Babel transformieren
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest"
  },

  // Welche Dateien getestet werden
  moduleFileExtensions: ["js", "jsx"],

  // Setup für jest-dom (toBeInTheDocument etc.)
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  // CSS / Assets mocken (wichtig bei Vite-Projekten)
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy"
  }
};