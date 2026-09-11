export const LOW_STOCK_TOOL = {
  type: 'function' as const,
  function: {
    name: 'get_low_stock_products',
    description:
      'Get products whose inventory quantity is at or below a threshold.',
    parameters: {
      type: 'object',
      properties: {
        threshold: {
          type: 'number',
          description: 'Maximum quantity to consider low stock.',
        },
      },
      required: ['threshold'],
      additionalProperties: false,
    },
  },
};

export const AI_ANSWER_FORMAT = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          quantity: { type: 'number' },
        },
        required: ['id', 'name', 'quantity'],
        additionalProperties: false,
      },
    },
  },
  required: ['answer', 'products'],
  additionalProperties: false,
};
