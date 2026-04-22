import { test, expect } from '@playwright/test';

const BASE_URL      = 'https://eventhub.rahulshettyacademy.com';
const USER_EMAIL    = 'rahulshetty1@gmail.com';
const USER_PASSWORD = 'Magiclife1!';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder('you@email.com').fill(USER_EMAIL);
  await page.getByLabel('Password').fill(USER_PASSWORD);
  await page.locator('#login-btn').click();
  await expect(page.getByRole('link', { name: /Browse Events/i }).first()).toBeVisible();
}

/**
 * Books the first available event on the events page.
 * Returns { bookingRef, eventTitle } from the confirmation card.
 * Precondition: user must already be logged in.
 */
async function bookEvent(page) {
  await page.goto(`${BASE_URL}/events`);

  // Pick the first card that has a visible "Book Now" button
  const firstCard = page.getByTestId('event-card').filter({
    has: page.getByTestId('book-now-btn'),
  }).first();
  await expect(firstCard).toBeVisible();

  const eventTitle = (await firstCard.locator('h3').textContent())?.trim() ?? '';
  console.log(`Booking event: "${eventTitle}"`);

  await firstCard.getByTestId('book-now-btn').click();
  await expect(page).toHaveURL(/\/events\/\d+/);

  // Fill booking form
  await page.getByLabel('Full Name').fill('Test User');
  await page.locator('#customer-email').fill('testuser@example.com');
  await page.getByPlaceholder('+91 98765 43210').fill('9876543210');
  await page.locator('.confirm-booking-btn').click();

  // Wait for confirmation card and capture booking ref
  const refEl = page.locator('.booking-ref').first();
  await expect(refEl).toBeVisible();
  const bookingRef = (await refEl.textContent())?.trim() ?? '';
  console.log(`Booking confirmed. Ref: ${bookingRef}`);
  return { bookingRef, eventTitle };
}

/**
 * Clears all bookings for a clean test state. Safe to call when already empty.
 */
async function clearBookings(page) {
  await page.goto(`${BASE_URL}/bookings`);
  const alreadyEmpty = await page.getByText('No bookings yet').isVisible().catch(() => false);
  if (alreadyEmpty) return;

  // "Clear all bookings" uses native window.confirm — register handler before clicking
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /clear all bookings/i }).click();
  await expect(page.getByText('No bookings yet')).toBeVisible();
}

// ── Test Suite ─────────────────────────────────────────────────────────────────

test.describe('Booking Flow — Critical Happy Paths (E2E)', () => {

  // TC-001 ───────────────────────────────────────────────────────────────────
  test('TC-001: booking card appears on bookings list with correct details', async ({ page }) => {
    // -- Step 1: Login, clear prior state, create one booking --
    await login(page);
    await clearBookings(page);
    const { bookingRef, eventTitle } = await bookEvent(page);

    // -- Step 2: Navigate to /bookings --
    await page.goto(`${BASE_URL}/bookings`);

    // -- Step 3: Locate the booking card by its reference --
    const card = page.getByTestId('booking-card').filter({ hasText: bookingRef });
    await expect(card).toBeVisible();

    // -- Step 4: Assert card shows all expected data --
    await expect(card).toContainText(bookingRef);
    await expect(card).toContainText(eventTitle);
    await expect(card).toContainText('confirmed');

    // -- Step 5: Assert "View Details" link is present on the card --
    await expect(card.getByRole('link', { name: 'View Details' })).toBeVisible();
  });

  // TC-002 ───────────────────────────────────────────────────────────────────
  test('TC-002: booking detail page shows all required sections', async ({ page }) => {
    // -- Step 1: Login, clear prior state, create one booking --
    await login(page);
    await clearBookings(page);
    const { bookingRef, eventTitle } = await bookEvent(page);

    // -- Step 2: Navigate to bookings list and open the detail page --
    await page.goto(`${BASE_URL}/bookings`);
    const card = page.getByTestId('booking-card').filter({ hasText: bookingRef });
    await card.getByRole('link', { name: 'View Details' }).click();
    await expect(page).toHaveURL(/\/bookings\/\d+/);

    // -- Step 3: Assert breadcrumb shows the booking reference --
    // Breadcrumb: My Bookings / <bookingRef>
    await expect(page.locator('nav span.font-mono')).toContainText(bookingRef);

    // -- Step 4: Assert booking ref and badge in page header --
    await expect(page.locator('span.font-mono.font-bold').first()).toContainText(bookingRef);

    // -- Step 5: Assert Event Details section with booked event --
    await expect(page.getByText('Event Details')).toBeVisible();
    await expect(page.getByText(eventTitle).first()).toBeVisible();

    // -- Step 6: Assert Customer Details section with submitted info --
    await expect(page.getByText('Customer Details')).toBeVisible();
    await expect(page.getByText('Test User')).toBeVisible();
    await expect(page.getByText('testuser@example.com')).toBeVisible();

    // -- Step 7: Assert Payment Summary section --
    await expect(page.getByText('Payment Summary')).toBeVisible();
    await expect(page.getByText('Total Paid')).toBeVisible();

    // -- Step 8: Assert Refund check button is present --
    await expect(page.locator('#check-refund-btn')).toBeVisible();

    // -- Step 9: Assert Cancel Booking button is present for confirmed booking --
    await expect(page.getByRole('button', { name: 'Cancel Booking' })).toBeVisible();
  });

  // TC-003 ───────────────────────────────────────────────────────────────────
  test('TC-003: cancel booking from detail page shows toast and redirects to list', async ({ page }) => {
    // -- Step 1: Login, clear prior state, create one booking --
    await login(page);
    await clearBookings(page);
    const { bookingRef } = await bookEvent(page);

    // -- Step 2: Navigate to the booking detail page --
    await page.goto(`${BASE_URL}/bookings`);
    const card = page.getByTestId('booking-card').filter({ hasText: bookingRef });
    await card.getByRole('link', { name: 'View Details' }).click();
    await expect(page).toHaveURL(/\/bookings\/\d+/);

    // -- Step 3: Click "Cancel Booking" — custom ConfirmDialog should appear --
    await page.getByRole('button', { name: 'Cancel Booking' }).click();
    await expect(page.getByText('Cancel this booking?')).toBeVisible();
    await expect(page.getByTestId('confirm-dialog-yes')).toBeVisible();

    // -- Step 4: Confirm the cancellation --
    await page.getByTestId('confirm-dialog-yes').click();

    // -- Step 5: Assert redirect to /bookings and success toast --
    await expect(page).toHaveURL(`${BASE_URL}/bookings`);
    await expect(page.getByText('Booking cancelled successfully')).toBeVisible();

    // -- Step 6: Assert the cancelled booking is no longer visible --
    await expect(page.getByText('No bookings yet')).toBeVisible();
  });

});
