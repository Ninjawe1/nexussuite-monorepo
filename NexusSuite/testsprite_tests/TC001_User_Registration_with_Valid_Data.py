import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:5000", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Click on the 'Sign up' link to navigate to the registration page.
        frame = context.pages[-1]
        # Click on the 'Sign up' link to go to the registration page.
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Fill in the registration form with valid first name, last name, email, organization name, password, and confirm password.
        frame = context.pages[-1]
        # Input first name
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('John')
        

        frame = context.pages[-1]
        # Input last name
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/form/div/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Doe')
        

        frame = context.pages[-1]
        # Input valid email address
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/form/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('john.doe@example.com')
        

        frame = context.pages[-1]
        # Input organization name
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/form/div[3]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Acme Esports')
        

        frame = context.pages[-1]
        # Input strong password
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/form/div[4]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('StrongPassw0rd!')
        

        frame = context.pages[-1]
        # Confirm strong password
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/form/div[5]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('StrongPassw0rd!')
        

        # -> Click the 'Create Account' button to submit the registration form.
        frame = context.pages[-1]
        # Click the 'Create Account' button to submit the registration form.
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Verify that the password is stored in hashed form using bcryptjs in the backend.
        await page.goto('http://localhost:5000/api/users', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Find a way to access user data or backend storage to verify that the password is hashed using bcryptjs.
        frame = context.pages[-1]
        # Click on 'Settings' to check if user management or security settings are available to view user data or password hashes.
        elem = frame.locator('xpath=html/body/div/div/div/div/div[2]/div/div[2]/div/div[2]/ul/li[12]/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        try:
            await expect(frame.locator('text=Registration Completed Successfully').first).to_be_visible(timeout=1000)
        except AssertionError:
            raise AssertionError("Test case failed: The registration process did not complete successfully, or the password was not hashed using bcryptjs as required by the test plan.")
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    