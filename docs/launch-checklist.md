# Paisa V1 launch checklist

The application provides consent capture, account export, and deletion. The operator must complete
these non-code requirements before public launch.

- Provision TLS on the India-resident host and verify HSTS is served in production.
- Encrypt the SQLite volume and run automated encrypted backups. Test a restore and record the
  recovery point and recovery time objectives.
- Publish the operator's grievance contact and replace the pre-launch placeholder in the privacy
  notice.
- Approve a retention schedule, a data-request procedure, and an incident/breach response plan.
- Review the content-security policy after deployment, particularly any third-party assets added
  after V1.
- Run the responsive and keyboard checks at 360, 768, 1024, and 1440 px in supported browsers.
- Configure a privacy-safe error destination and structured request logging; neither may include
  names, emails, session tokens, notes, or monetary amounts.
