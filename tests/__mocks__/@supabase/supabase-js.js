const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        gt: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      })),
      limit: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: null
      })
    })),
    upsert: jest.fn(() => ({
      error: null
    })),
    delete: jest.fn(() => ({
      neq: jest.fn(() => ({
        error: null
      }))
    }))
  }))
};

const createClient = jest.fn(() => mockSupabaseClient);

module.exports = {
  createClient,
  mockSupabaseClient
};

