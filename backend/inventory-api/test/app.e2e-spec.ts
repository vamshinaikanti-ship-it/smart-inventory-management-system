import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello Vamshi!');
  });

  it('/products (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/products');
    const payload = response.body as { data?: unknown[] };

    expect(response.status).toBe(200);
    expect(Array.isArray(payload.data ?? payload)).toBe(true);
  });

  it('/category (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/category');
    const payload = response.body as unknown[];

    expect(response.status).toBe(200);
    expect(Array.isArray(payload)).toBe(true);
  });

  it('/products (POST) should create a product when category_id is provided', async () => {
    const categoryResponse = await request(app.getHttpServer())
      .post('/category')
      .send({ name: 'API Validation Category' });

    expect(categoryResponse.status).toBe(201);

    const categoryBody = categoryResponse.body as { id?: number };
    const productResponse = await request(app.getHttpServer())
      .post('/products')
      .send({
        name: 'API Validation Product',
        description: 'Created in API validation test',
        price: 19.99,
        quantity: 5,
        category_id: categoryBody.id,
      });
    const productBody = productResponse.body as { name?: string };

    expect(productResponse.status).toBe(201);
    expect(productBody.name).toBe('API Validation Product');
  });

  afterEach(async () => {
    await app.close();
  });
});
