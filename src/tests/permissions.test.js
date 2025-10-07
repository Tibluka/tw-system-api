const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const ProductionOrder = require('../models/ProductionOrder');
const ProductionSheet = require('../models/ProductionSheet');
const { ERROR_CODES } = require('../constants/errorCodes');

describe('Permission System Tests', () => {
  let defaultUser, printingUser, adminUser, financingUser;
  let defaultToken, printingToken, adminToken, financingToken;
  let testProductionOrder, testProductionSheet;

  beforeAll(async () => {
    // Criar usuários de teste com diferentes perfis
    defaultUser = await User.create({
      name: 'Default User',
      email: 'default@test.com',
      password: 'password123',
      role: 'DEFAULT'
    });

    printingUser = await User.create({
      name: 'Printing User',
      email: 'printing@test.com',
      password: 'password123',
      role: 'PRINTING'
    });

    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'ADMIN'
    });

    financingUser = await User.create({
      name: 'Financing User',
      email: 'financing@test.com',
      password: 'password123',
      role: 'FINANCING'
    });

    // Gerar tokens
    defaultToken = defaultUser.generateAuthToken();
    printingToken = printingUser.generateAuthToken();
    adminToken = adminUser.generateAuthToken();
    financingToken = financingUser.generateAuthToken();

    // Criar dados de teste
    testProductionOrder = await ProductionOrder.create({
      developmentId: new mongoose.Types.ObjectId(),
      productionType: {
        type: 'rotary',
        meters: 100,
        fabricType: 'Test Fabric'
      },
      status: 'PILOT_PRODUCTION',
      internalReference: 'TEST001'
    });

    testProductionSheet = await ProductionSheet.create({
      productionOrderId: testProductionOrder._id,
      internalReference: 'TEST001',
      entryDate: new Date(),
      expectedExitDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      machine: 1,
      stage: 'PRINTING'
    });
  });

  afterAll(async () => {
    // Limpar dados de teste
    await User.deleteMany({ email: { $regex: '@test.com' } });
    await ProductionOrder.deleteMany({ internalReference: 'TEST001' });
    await ProductionSheet.deleteMany({ internalReference: 'TEST001' });
  });

  describe('DEFAULT Profile Permissions', () => {
    test('should access all endpoints except production-receipts', async () => {
      // Deve acessar clients
      const clientsResponse = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${defaultToken}`);
      expect(clientsResponse.status).toBe(200);

      // Deve acessar developments
      const developmentsResponse = await request(app)
        .get('/api/v1/developments')
        .set('Authorization', `Bearer ${defaultToken}`);
      expect(developmentsResponse.status).toBe(200);

      // Deve acessar production-orders
      const productionOrdersResponse = await request(app)
        .get('/api/v1/production-orders')
        .set('Authorization', `Bearer ${defaultToken}`);
      expect(productionOrdersResponse.status).toBe(200);

      // Deve acessar production-sheets
      const productionSheetsResponse = await request(app)
        .get('/api/v1/production-sheets')
        .set('Authorization', `Bearer ${defaultToken}`);
      expect(productionSheetsResponse.status).toBe(200);

      // Deve acessar delivery-sheets
      const deliverySheetsResponse = await request(app)
        .get('/api/v1/delivery-sheets')
        .set('Authorization', `Bearer ${defaultToken}`);
      expect(deliverySheetsResponse.status).toBe(200);

      // NÃO deve acessar production-receipts
      const productionReceiptsResponse = await request(app)
        .get('/api/v1/production-receipts')
        .set('Authorization', `Bearer ${defaultToken}`);
      expect(productionReceiptsResponse.status).toBe(403);
      expect(productionReceiptsResponse.body.code).toBe(ERROR_CODES.ENDPOINT_ACCESS_DENIED);
    });
  });

  describe('PRINTING Profile Permissions', () => {
    test('should only access production-sheets endpoints', async () => {
      // Deve acessar production-sheets
      const productionSheetsResponse = await request(app)
        .get('/api/v1/production-sheets')
        .set('Authorization', `Bearer ${printingToken}`);
      expect(productionSheetsResponse.status).toBe(200);

      // NÃO deve acessar clients
      const clientsResponse = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${printingToken}`);
      expect(clientsResponse.status).toBe(403);
      expect(clientsResponse.body.code).toBe(ERROR_CODES.ENDPOINT_ACCESS_DENIED);

      // NÃO deve acessar developments
      const developmentsResponse = await request(app)
        .get('/api/v1/developments')
        .set('Authorization', `Bearer ${printingToken}`);
      expect(developmentsResponse.status).toBe(403);
      expect(developmentsResponse.body.code).toBe(ERROR_CODES.ENDPOINT_ACCESS_DENIED);

      // NÃO deve acessar production-orders
      const productionOrdersResponse = await request(app)
        .get('/api/v1/production-orders')
        .set('Authorization', `Bearer ${printingToken}`);
      expect(productionOrdersResponse.status).toBe(403);
      expect(productionOrdersResponse.body.code).toBe(ERROR_CODES.ENDPOINT_ACCESS_DENIED);

      // NÃO deve acessar delivery-sheets
      const deliverySheetsResponse = await request(app)
        .get('/api/v1/delivery-sheets')
        .set('Authorization', `Bearer ${printingToken}`);
      expect(deliverySheetsResponse.status).toBe(403);
      expect(deliverySheetsResponse.body.code).toBe(ERROR_CODES.ENDPOINT_ACCESS_DENIED);

      // NÃO deve acessar production-receipts
      const productionReceiptsResponse = await request(app)
        .get('/api/v1/production-receipts')
        .set('Authorization', `Bearer ${printingToken}`);
      expect(productionReceiptsResponse.status).toBe(403);
      expect(productionReceiptsResponse.body.code).toBe(ERROR_CODES.ENDPOINT_ACCESS_DENIED);
    });

    test('should only be able to update stage and machine when production order is PILOT_PRODUCTION', async () => {
      // Teste com status PILOT_PRODUCTION (deve funcionar)
      const validUpdateResponse = await request(app)
        .patch(`/api/v1/production-sheets/${testProductionSheet._id}/stage`)
        .set('Authorization', `Bearer ${printingToken}`)
        .send({ stage: 'CALENDERING' });
      expect(validUpdateResponse.status).toBe(200);

      // Alterar status da ordem de produção para CREATED
      await ProductionOrder.findByIdAndUpdate(testProductionOrder._id, { status: 'CREATED' });

      // Teste com status CREATED (não deve funcionar)
      const invalidUpdateResponse = await request(app)
        .patch(`/api/v1/production-sheets/${testProductionSheet._id}/stage`)
        .set('Authorization', `Bearer ${printingToken}`)
        .send({ stage: 'FINISHED' });
      expect(invalidUpdateResponse.status).toBe(403);
      expect(invalidUpdateResponse.body.code).toBe(ERROR_CODES.PRODUCTION_ORDER_STATUS_RESTRICTION);

      // Restaurar status para PILOT_PRODUCTION
      await ProductionOrder.findByIdAndUpdate(testProductionOrder._id, { status: 'PILOT_PRODUCTION' });
    });

    test('should only be able to update stage and machine fields', async () => {
      const invalidUpdateResponse = await request(app)
        .put(`/api/v1/production-sheets/${testProductionSheet._id}`)
        .set('Authorization', `Bearer ${printingToken}`)
        .send({ 
          stage: 'CALENDERING',
          temperature: 150, // Campo não permitido
          velocity: 100     // Campo não permitido
        });
      expect(invalidUpdateResponse.status).toBe(403);
      expect(invalidUpdateResponse.body.code).toBe(ERROR_CODES.FIELD_UPDATE_RESTRICTION);
    });
  });

  describe('ADMIN Profile Permissions', () => {
    test('should have access to all endpoints', async () => {
      // Deve acessar todos os endpoints
      const clientsResponse = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(clientsResponse.status).toBe(200);

      const developmentsResponse = await request(app)
        .get('/api/v1/developments')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(developmentsResponse.status).toBe(200);

      const productionOrdersResponse = await request(app)
        .get('/api/v1/production-orders')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(productionOrdersResponse.status).toBe(200);

      const productionSheetsResponse = await request(app)
        .get('/api/v1/production-sheets')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(productionSheetsResponse.status).toBe(200);

      const deliverySheetsResponse = await request(app)
        .get('/api/v1/delivery-sheets')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deliverySheetsResponse.status).toBe(200);

      const productionReceiptsResponse = await request(app)
        .get('/api/v1/production-receipts')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(productionReceiptsResponse.status).toBe(200);
    });
  });

  describe('FINANCING Profile Permissions', () => {
    test('should only access clients and production-receipts endpoints', async () => {
      // Deve acessar clients
      const clientsResponse = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${financingToken}`);
      expect(clientsResponse.status).toBe(200);

      // Deve acessar production-receipts
      const productionReceiptsResponse = await request(app)
        .get('/api/v1/production-receipts')
        .set('Authorization', `Bearer ${financingToken}`);
      expect(productionReceiptsResponse.status).toBe(200);

      // NÃO deve acessar developments
      const developmentsResponse = await request(app)
        .get('/api/v1/developments')
        .set('Authorization', `Bearer ${financingToken}`);
      expect(developmentsResponse.status).toBe(403);
      expect(developmentsResponse.body.code).toBe(ERROR_CODES.PROFILE_ACCESS_DENIED);

      // NÃO deve acessar production-orders
      const productionOrdersResponse = await request(app)
        .get('/api/v1/production-orders')
        .set('Authorization', `Bearer ${financingToken}`);
      expect(productionOrdersResponse.status).toBe(403);
      expect(productionOrdersResponse.body.code).toBe(ERROR_CODES.PROFILE_ACCESS_DENIED);

      // NÃO deve acessar production-sheets
      const productionSheetsResponse = await request(app)
        .get('/api/v1/production-sheets')
        .set('Authorization', `Bearer ${financingToken}`);
      expect(productionSheetsResponse.status).toBe(403);
      expect(productionSheetsResponse.body.code).toBe(ERROR_CODES.ENDPOINT_ACCESS_DENIED);

      // NÃO deve acessar delivery-sheets
      const deliverySheetsResponse = await request(app)
        .get('/api/v1/delivery-sheets')
        .set('Authorization', `Bearer ${financingToken}`);
      expect(deliverySheetsResponse.status).toBe(403);
      expect(deliverySheetsResponse.body.code).toBe(ERROR_CODES.PROFILE_ACCESS_DENIED);
    });
  });
});
