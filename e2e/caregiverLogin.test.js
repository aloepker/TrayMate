describe('Caregiver Login', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should login and go to caregiver dashboard', async () => {
    // Wait for screen to load first
    await waitFor(element(by.id('emailInput')))
      .toBeVisible()
      .withTimeout(5000);

    // Type email
    await element(by.id('emailInput')).tap();
    await element(by.id('emailInput')).replaceText('caregiver@traymate.com');

    // Type password
    await element(by.id('passwordInput')).tap();
    await element(by.id('passwordInput')).replaceText('care123');

    // Close keyboard (Android)
    await device.pressBack();

    // Tap Sign In
    await element(by.id('loginButton')).tap();

    // Wait for dashboard
    await waitFor(element(by.id('caregiverDashboard')))
      .toBeVisible()
      .withTimeout(8000);

    await expect(element(by.id('caregiverDashboard'))).toBeVisible();
  });
});