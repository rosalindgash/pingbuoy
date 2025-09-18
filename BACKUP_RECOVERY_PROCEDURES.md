# Backup and Recovery Procedures for PingBuoy

## 🛡️ Overview

This document outlines comprehensive backup and recovery procedures for PingBuoy's Supabase database, including automated backup restore drills, validation systems, and disaster recovery protocols.

## 📋 System Architecture

### Backup Strategy
- **Primary Backups**: Automated Supabase backups (daily)
- **Validation**: Automated integrity checks (daily)
- **Restore Drills**: Periodic restore testing (weekly)
- **Monitoring**: Continuous health monitoring with alerting
- **Retention**: 90-day backup retention policy

### Components
1. **Backup Validator** (`scripts/backup-validator.js`)
2. **Restore Drill System** (`scripts/backup-restore-drill.sh`)
3. **Health Monitor** (`scripts/backup-health-monitor.js`)
4. **GitHub Actions Automation** (`.github/workflows/backup-drill.yml`)

## 🔧 Setup and Configuration

### Required Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_PROJECT_ID=your_project_id
SUPABASE_ACCESS_TOKEN=your_access_token

# Monitoring and Alerting
BACKUP_NOTIFICATION_WEBHOOK=https://hooks.slack.com/your/webhook
BACKUP_ALERT_WEBHOOK=https://hooks.slack.com/your/alert/webhook
METRICS_WEBHOOK=https://your-metrics-endpoint.com/webhook

# Configuration
BACKUP_LOG_DIR=./backup-validation-logs
BACKUP_DRILL_LOG_DIR=./backup-drill-logs
BACKUP_RETENTION_DAYS=90
NOTIFICATION_WEBHOOK=https://your-notification-webhook.com

# Optional SMTP Configuration
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

### GitHub Repository Secrets

Configure these secrets in **Settings → Secrets and variables → Actions**:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_ACCESS_TOKEN`
- `BACKUP_NOTIFICATION_WEBHOOK`
- `BACKUP_ALERT_WEBHOOK`
- `METRICS_WEBHOOK`

### Initial Setup

```bash
# 1. Install required dependencies
npm install @supabase/supabase-js

# 2. Make scripts executable
chmod +x scripts/backup-restore-drill.sh
chmod +x scripts/backup-validator.js
chmod +x scripts/backup-health-monitor.js

# 3. Create log directories
mkdir -p backup-validation-logs
mkdir -p backup-drill-logs

# 4. Test the backup validator
node scripts/backup-validator.js

# 5. Test the health monitor
node scripts/backup-health-monitor.js
```

## 🔄 Automated Backup Drills

### Drill Types

#### 1. **Full Drill** (Default)
- Complete backup validation
- Full database restore to test environment
- Data integrity verification
- Performance testing
- Cleanup

#### 2. **Quick Drill**
- Basic backup validation
- Schema-only restore test
- Critical table verification

#### 3. **Validation Only**
- Backup integrity checks
- No actual restore
- Metadata validation

### Drill Schedule

- **Weekly**: Full backup restore drill (Sundays 3 AM UTC)
- **Daily**: Backup validation checks
- **Monthly**: Extended performance testing
- **Quarterly**: Full disaster recovery simulation

### Manual Drill Execution

```bash
# Run full backup restore drill
./scripts/backup-restore-drill.sh full

# Run quick validation drill
./scripts/backup-restore-drill.sh quick

# Run validation-only check
./scripts/backup-restore-drill.sh validate-only

# Check drill help
./scripts/backup-restore-drill.sh help
```

### GitHub Actions Workflow

Trigger manual drills via GitHub Actions:

1. Go to **Actions** → **Backup Restore Drill**
2. Click **Run workflow**
3. Select drill type (full/quick/validate-only)
4. Enable/disable notifications
5. Run workflow

## 📊 Monitoring and Alerting

### Health Metrics

The system tracks these key metrics:

- **Validation Success Rate**: Percentage of successful backup validations
- **Drill Success Rate**: Percentage of successful restore drills
- **Backup Freshness**: Time since last successful backup
- **Data Integrity Score**: Health score based on validation checks
- **Recovery Time Objective (RTO)**: Target time to restore service
- **Recovery Point Objective (RPO)**: Maximum acceptable data loss

### Alert Thresholds

| Metric | Warning Threshold | Critical Threshold |
|--------|------------------|-------------------|
| Failed Validations | 2 consecutive | 3 consecutive |
| Failed Drills | 1 consecutive | 2 consecutive |
| Backup Age | 48 hours | 72 hours |
| Drill Age | 7 days | 14 days |
| Health Score | < 70 | < 50 |

### Alert Channels

- **Slack**: Real-time alerts to operations channel
- **Email**: Critical alerts to on-call team
- **Dashboard**: Visual health status indicators
- **PagerDuty**: Integration for critical incidents

### Health Check Automation

```bash
# Run health check manually
node scripts/backup-health-monitor.js

# Schedule health checks (add to crontab)
0 */6 * * * /path/to/pingbuoy/scripts/backup-health-monitor.js

# View health reports
ls -la backup-validation-logs/health-*
```

## 🚨 Disaster Recovery Procedures

### Recovery Scenarios

#### 1. **Complete Database Loss**

**Steps:**
1. Assess scope of data loss
2. Identify most recent valid backup
3. Provision new Supabase instance
4. Execute full database restore
5. Validate data integrity
6. Update application configuration
7. Redirect traffic to restored instance

**Estimated RTO**: 2-4 hours
**Estimated RPO**: < 24 hours

#### 2. **Partial Data Corruption**

**Steps:**
1. Identify affected tables/data
2. Stop writes to affected areas
3. Restore specific tables from backup
4. Verify restored data integrity
5. Resume normal operations

**Estimated RTO**: 30-60 minutes
**Estimated RPO**: < 1 hour

#### 3. **Configuration/Schema Issues**

**Steps:**
1. Identify schema problems
2. Create backup of current state
3. Restore schema from known-good backup
4. Apply necessary migrations
5. Validate application functionality

**Estimated RTO**: 15-30 minutes
**Estimated RPO**: Minimal

### Recovery Checklist

#### Pre-Recovery
- [ ] Alert team of incident
- [ ] Assess extent of data loss
- [ ] Document timeline of events
- [ ] Notify stakeholders
- [ ] Prepare recovery environment

#### During Recovery
- [ ] Execute restore procedure
- [ ] Monitor restore progress
- [ ] Validate data integrity
- [ ] Test critical functionality
- [ ] Update DNS/configuration

#### Post-Recovery
- [ ] Verify all systems operational
- [ ] Communicate restoration to users
- [ ] Conduct post-incident review
- [ ] Update procedures if needed
- [ ] Document lessons learned

## 🔍 Validation Procedures

### Backup Validation Checks

#### 1. **Structural Validation**
- Table existence verification
- Schema consistency checks
- Index integrity validation
- Constraint verification

#### 2. **Data Integrity Validation**
- Row count verification
- Referential integrity checks
- Data type validation
- Sample data quality checks

#### 3. **Performance Validation**
- Query response time testing
- Index utilization verification
- Connection handling tests
- Concurrent access validation

#### 4. **Functional Validation**
- Critical business logic testing
- User authentication verification
- API endpoint functionality
- Background job processing

### Validation Results

Results are stored in JSON format with the following structure:

```json
{
  "validationId": "validation_1234567890",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "status": "pass",
  "checks": [
    {
      "category": "table_structure",
      "checks": [...],
      "status": "pass"
    }
  ],
  "metrics": {
    "users_count": 1250,
    "sites_count": 3500,
    "database_size_mb": 45
  },
  "summary": {
    "total_checks": 15,
    "passed_checks": 14,
    "failed_checks": 1,
    "warning_checks": 0
  }
}
```

## 📈 Best Practices

### Backup Management

1. **Regular Testing**: Run restore drills weekly
2. **Multiple Locations**: Store backups in multiple regions
3. **Version Control**: Maintain backup of schema changes
4. **Documentation**: Keep recovery procedures updated
5. **Access Control**: Limit backup access to authorized personnel

### Monitoring

1. **Automated Alerts**: Set up proactive alerting
2. **Dashboard Monitoring**: Visual health indicators
3. **Regular Reviews**: Monthly backup health reviews
4. **Incident Tracking**: Document all backup-related incidents
5. **Continuous Improvement**: Regular procedure updates

### Security

1. **Encrypted Backups**: Ensure backups are encrypted at rest
2. **Access Logging**: Log all backup access attempts
3. **Role-based Access**: Implement least-privilege access
4. **Regular Audits**: Quarterly backup security reviews
5. **Incident Response**: Clear escalation procedures

## 🛠️ Troubleshooting

### Common Issues

#### Backup Validation Failures

**Symptoms**: Validation reports show failed checks
**Solutions**:
1. Check network connectivity to Supabase
2. Verify service role key permissions
3. Review database schema changes
4. Check for data corruption
5. Validate backup file integrity

#### Restore Drill Failures

**Symptoms**: Restore operations fail or timeout
**Solutions**:
1. Check target environment capacity
2. Verify backup file accessibility
3. Review database permissions
4. Check network bandwidth
5. Validate restore procedure steps

#### Monitoring Alerts Not Firing

**Symptoms**: No alerts despite issues
**Solutions**:
1. Check webhook configurations
2. Verify notification service status
3. Review alert threshold settings
4. Test notification endpoints
5. Check monitoring script execution

### Log Analysis

#### Validation Logs
```bash
# View latest validation log
tail -f backup-validation-logs/validation-*.log

# Search for errors
grep -i "error\|fail" backup-validation-logs/*.log

# Check specific validation
cat backup-validation-logs/validation-report-*.json | jq
```

#### Drill Logs
```bash
# View latest drill log
tail -f backup-drill-logs/backup-drill-*.log

# Check drill summary
cat backup-drill-logs/drill-report-*.json | jq .summary

# Monitor drill progress
watch tail -n 20 backup-drill-logs/backup-drill-*.log
```

#### Health Monitor Logs
```bash
# Check health status
node scripts/backup-health-monitor.js

# View health reports
ls -la backup-validation-logs/health-*

# Monitor health trends
cat backup-validation-logs/health-report-*.json | jq .health
```

## 📞 Emergency Contacts

### Escalation Matrix

| Issue Level | Contact | Response Time |
|-------------|---------|---------------|
| Critical | On-call engineer | 15 minutes |
| High | Development team lead | 1 hour |
| Medium | DevOps team | 4 hours |
| Low | Regular support | 24 hours |

### Contact Information

- **On-call**: [Insert on-call system/phone]
- **DevOps Team**: [Insert team email/Slack]
- **Database Admin**: [Insert DBA contact]
- **Supabase Support**: [Insert support channel]

## 📋 Maintenance Schedule

### Weekly Tasks
- [ ] Review backup drill results
- [ ] Check health monitoring alerts
- [ ] Validate backup storage capacity
- [ ] Test notification systems

### Monthly Tasks
- [ ] Comprehensive backup health review
- [ ] Update recovery time estimates
- [ ] Review and update procedures
- [ ] Conduct team training session

### Quarterly Tasks
- [ ] Full disaster recovery simulation
- [ ] Security audit of backup systems
- [ ] Performance benchmarking
- [ ] Documentation review and updates

### Annual Tasks
- [ ] Complete procedure overhaul review
- [ ] Technology stack evaluation
- [ ] Compliance audit
- [ ] Team skill assessment and training

## 📊 Compliance and Reporting

### Compliance Requirements

- **SOC 2**: Backup and recovery controls
- **GDPR**: Data protection and recovery
- **Industry Standards**: Best practice adherence

### Reporting

- **Monthly**: Backup health dashboard
- **Quarterly**: Executive summary report
- **Annual**: Comprehensive audit report

---

## ✅ Quick Reference

### Emergency Recovery Commands

```bash
# 1. Assess backup status
node scripts/backup-health-monitor.js

# 2. Run immediate validation
node scripts/backup-validator.js

# 3. Execute emergency restore drill
./scripts/backup-restore-drill.sh full

# 4. Check GitHub Actions status
# Go to repository → Actions → Backup Restore Drill

# 5. Monitor restoration progress
tail -f backup-drill-logs/backup-drill-*.log
```

### Key File Locations

- **Scripts**: `scripts/backup-*`
- **Workflows**: `.github/workflows/backup-drill.yml`
- **Logs**: `backup-validation-logs/`, `backup-drill-logs/`
- **Configuration**: Environment variables and GitHub secrets

### Support Resources

- **Documentation**: This file (`BACKUP_RECOVERY_PROCEDURES.md`)
- **Monitoring Dashboard**: [Insert dashboard URL]
- **Status Page**: [Insert status page URL]
- **Support Channel**: [Insert Slack/Teams channel]

🎯 **Remember**: Regular testing and validation are key to reliable backup and recovery procedures. Always verify your backups can be successfully restored before you need them!