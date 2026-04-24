const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const sequelize = new Sequelize(
  process.env.DB_NAME || 'forensic_accounting',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

// User model
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: 'analyst' }
}, { tableName: 'users', timestamps: true });

// Benford Analysis model
const BenfordAnalysis = sequelize.define('BenfordAnalysis', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  company_name: { type: DataTypes.STRING, allowNull: false },
  dataset_type: { type: DataTypes.STRING, allowNull: false },
  total_transactions: { type: DataTypes.INTEGER, allowNull: false },
  deviation_score: { type: DataTypes.FLOAT, allowNull: false },
  conformity_level: { type: DataTypes.STRING, allowNull: false },
  digit_distribution: { type: DataTypes.JSONB },
  expected_distribution: { type: DataTypes.JSONB },
  analysis_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  status: { type: DataTypes.STRING, defaultValue: 'completed' },
  risk_level: { type: DataTypes.STRING },
  notes: { type: DataTypes.TEXT },
  ai_analysis: { type: DataTypes.JSONB }
}, { tableName: 'benford_analyses', timestamps: true });

// Transaction Anomaly model
const TransactionAnomaly = sequelize.define('TransactionAnomaly', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  transaction_id: { type: DataTypes.STRING, unique: true, allowNull: false },
  account_name: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  transaction_date: { type: DataTypes.DATE, allowNull: false },
  category: { type: DataTypes.STRING },
  counterparty: { type: DataTypes.STRING },
  anomaly_type: { type: DataTypes.STRING, allowNull: false },
  anomaly_score: { type: DataTypes.FLOAT, allowNull: false },
  description: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING, defaultValue: 'flagged' },
  risk_level: { type: DataTypes.STRING },
  ai_analysis: { type: DataTypes.JSONB }
}, { tableName: 'transaction_anomalies', timestamps: true });

// Embezzlement Pattern model
const EmbezzlementPattern = sequelize.define('EmbezzlementPattern', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  case_id: { type: DataTypes.STRING, unique: true, allowNull: false },
  suspect_name: { type: DataTypes.STRING, allowNull: false },
  department: { type: DataTypes.STRING, allowNull: false },
  pattern_type: { type: DataTypes.STRING, allowNull: false },
  estimated_loss: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  detection_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  period_start: { type: DataTypes.DATE },
  period_end: { type: DataTypes.DATE },
  evidence_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  confidence_score: { type: DataTypes.FLOAT },
  status: { type: DataTypes.STRING, defaultValue: 'under_investigation' },
  description: { type: DataTypes.TEXT },
  risk_level: { type: DataTypes.STRING },
  ai_analysis: { type: DataTypes.JSONB }
}, { tableName: 'embezzlement_patterns', timestamps: true });

// Fraud Score model
const FraudScore = sequelize.define('FraudScore', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  company_name: { type: DataTypes.STRING, allowNull: false },
  fiscal_year: { type: DataTypes.STRING, allowNull: false },
  overall_score: { type: DataTypes.FLOAT, allowNull: false },
  revenue_manipulation_score: { type: DataTypes.FLOAT },
  expense_manipulation_score: { type: DataTypes.FLOAT },
  asset_misstatement_score: { type: DataTypes.FLOAT },
  disclosure_score: { type: DataTypes.FLOAT },
  altman_z_score: { type: DataTypes.FLOAT },
  beneish_m_score: { type: DataTypes.FLOAT },
  risk_level: { type: DataTypes.STRING },
  red_flags: { type: DataTypes.JSONB },
  status: { type: DataTypes.STRING, defaultValue: 'scored' },
  notes: { type: DataTypes.TEXT },
  ai_analysis: { type: DataTypes.JSONB }
}, { tableName: 'fraud_scores', timestamps: true });

// Audit Log model
const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER },
  user_name: { type: DataTypes.STRING },
  action: { type: DataTypes.STRING, allowNull: false },
  entity_type: { type: DataTypes.STRING },
  entity_id: { type: DataTypes.INTEGER },
  details: { type: DataTypes.JSONB },
  ip_address: { type: DataTypes.STRING }
}, { tableName: 'audit_logs', timestamps: true });

// Investigation Report model
const InvestigationReport = sequelize.define('InvestigationReport', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  report_number: { type: DataTypes.STRING, unique: true, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  investigator_name: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'draft' },
  priority: { type: DataTypes.STRING, defaultValue: 'medium' },
  summary: { type: DataTypes.TEXT },
  findings: { type: DataTypes.TEXT },
  recommendations: { type: DataTypes.TEXT },
  related_cases: { type: DataTypes.JSONB },
  evidence_summary: { type: DataTypes.JSONB },
  period_start: { type: DataTypes.DATE },
  period_end: { type: DataTypes.DATE },
  total_amount_at_risk: { type: DataTypes.DECIMAL(15, 2) }
}, { tableName: 'investigation_reports', timestamps: true });

module.exports = {
  sequelize,
  User,
  BenfordAnalysis,
  TransactionAnomaly,
  EmbezzlementPattern,
  FraudScore,
  AuditLog,
  InvestigationReport
};
