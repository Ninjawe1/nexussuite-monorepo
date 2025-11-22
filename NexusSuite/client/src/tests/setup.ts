import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock fetch globally
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
global.sessionStorage = sessionStorageMock as any;

// Mock window.location
const mockLocation = {
  href: "",
  pathname: "",
  search: "",
  hash: "",
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

// Mock window.open
const mockWindowOpen = vi.fn();
global.open = mockWindowOpen;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
  sessionStorageMock.getItem.mockReturnValue(null);
  mockLocation.href = "";
  mockLocation.pathname = "";
  mockLocation.search = "";
  mockLocation.hash = "";
});

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Set up environment variables for testing
process.env.VITE_API_URL = "http://localhost:3000";
process.env.VITE_POLAR_MOCK;
