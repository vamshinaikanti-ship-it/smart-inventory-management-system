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

export const SEARCH_PRODUCTS_TOOL = {
  type: 'function' as const,
  function: {
    name: 'search_products',
    description: 'Search products by name or keyword.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Keyword to search in product names.',
        },
        limit: {
          type: 'number',
          description: 'Optional maximum number of matches to return.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
};

export const GET_PRODUCT_BY_ID_TOOL = {
  type: 'function' as const,
  function: {
    name: 'get_product_by_id',
    description: 'Fetch a single product by its id.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Unique product id.',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
};

export const GET_TOTAL_INVENTORY_TOOL = {
  type: 'function' as const,
  function: {
    name: 'get_total_inventory',
    description: 'Return the total number of units across all products.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
};

export const GET_INVENTORY_VALUE_TOOL = {
  type: 'function' as const,
  function: {
    name: 'get_inventory_value',
    description: 'Return the total inventory value across all products.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
};

export const GET_PRODUCTS_BY_CATEGORY_TOOL = {
  type: 'function' as const,
  function: {
    name: 'get_products_by_category',
    description: 'Get all products belonging to a category id.',
    parameters: {
      type: 'object',
      properties: {
        category_id: {
          type: 'number',
          description: 'Category id to filter products by.',
        },
      },
      required: ['category_id'],
      additionalProperties: false,
    },
  },
};

export const GET_OUT_OF_STOCK_PRODUCTS_TOOL = {
  type: 'function' as const,
  function: {
    name: 'get_out_of_stock_products',
    description: 'Get products that are currently out of stock.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
};

export const INVENTORY_TOOLS = [
  LOW_STOCK_TOOL,
  SEARCH_PRODUCTS_TOOL,
  GET_PRODUCT_BY_ID_TOOL,
  GET_TOTAL_INVENTORY_TOOL,
  GET_INVENTORY_VALUE_TOOL,
  GET_PRODUCTS_BY_CATEGORY_TOOL,
  GET_OUT_OF_STOCK_PRODUCTS_TOOL,
];

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
