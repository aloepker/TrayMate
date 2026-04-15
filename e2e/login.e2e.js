describe('Login Flow (Caregiver/Kitchen)', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should login and navigate to dashboard', async () => {
    // Enter email
    await element(by.id('emailInput')).typeText('caregiver@traymate.com');

    // Enter password
    await element(by.id('passwordInput')).typeText('care123');

    // Tap login
    await element(by.id('loginButton')).tap();

    // Verify dashboard is visible
    await expect(element(by.id('dashboardScreen'))).toBeVisible();
  });
});