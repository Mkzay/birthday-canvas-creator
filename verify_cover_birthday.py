import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})

        # Navigate to the test birthday page
        await page.goto('http://localhost:8080/birthday/test')

        # Wait for "Skip intro" and click it
        try:
            await page.wait_for_selector('text="Skip intro"', timeout=5000)
            await page.click('text="Skip intro"', force=True)
        except Exception as e:
            print(f"No skip intro button found or error: {e}")

        # Wait for the envelope or "Tap to break the seal"
        try:
            print("Waiting for envelope...")
            await page.wait_for_selector('text="TAP TO BREAK THE SEAL"', timeout=5000)
            await page.click('text="TAP TO BREAK THE SEAL"', force=True)
            print("Clicked envelope.")
        except Exception as e:
            try:
                # Alternatively click the mail icon
                await page.click('.lucide-mail', force=True)
                print("Clicked mail icon.")
            except Exception as e2:
                print(f"Error clicking envelope: {e2}")

        # The transition takes a few seconds to open the envelope and start the slides
        await page.wait_for_timeout(8000)

        # Take a screenshot
        await page.screenshot(path='birthday_slide1_real.png')
        print("Screenshot saved to birthday_slide1_real.png")

        await browser.close()

asyncio.run(run())
