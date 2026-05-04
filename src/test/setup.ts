import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom doesn't implement ResizeObserver. Radix UI components (Checkbox,
// Popover, Dialog, etc.) use @radix-ui/react-use-size which depends on it.
// Stub the API at the global level so any test rendering shadcn/Radix
// components doesn't crash. Added during BuyerSignup.test.tsx (KI #97)
// because Case 5 renders the 7-field signup form which contains Checkbox.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
