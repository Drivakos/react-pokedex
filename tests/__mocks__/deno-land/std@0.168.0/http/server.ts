export const serve = jest.fn((handler) => {
  // Mock serve function that captures the handler
  return {
    handler,
    close: jest.fn()
  };
});
