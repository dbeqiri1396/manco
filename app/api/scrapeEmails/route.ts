import { NextResponse } from 'next/server';
import dbConnect from '../../../utils/mongoose'; // Mongoose connection
import Business from '../../../models/Business'; // Business model
import puppeteer from 'puppeteer';

// Define the maximum number of businesses to scrape per request (optional)
const MAX_BUSINESSES_TO_SCRAPE = 10;

// Function to fetch businesses from MongoDB that have websites and haven't been scraped yet
async function fetchBusinessesToScrape() {
    await dbConnect(); // Ensure the database is connected
    return Business.find({
        website: { $ne: 'No website available' },  // Has a website
        scraped: { $ne: true }                     // Hasn't been scraped yet
    }).limit(MAX_BUSINESSES_TO_SCRAPE);            // Limit the number of businesses to process at once
}

// Function to scrape emails from a website using Puppeteer
async function scrapeEmailsFromWebsite(website: string): Promise<string[]> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    let emails: string[] = [];

    try {
        await page.goto(website, { waitUntil: 'networkidle2' });

        // Get the page content
        const content = await page.content();

        // Extract emails using regex
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        emails = content.match(emailRegex) || [];

    } catch (error) {
        console.error('Error scraping emails from website:', website, error);
    } finally {
        await browser.close();
    }

    return emails;
}

// Function to scrape emails for all businesses and update the MongoDB records
async function scrapeAndUpdateEmailsForBusinesses() {
    const businesses = await fetchBusinessesToScrape();

    for (const business of businesses) {
        const { website, _id } = business;

        // Scrape the website for emails
        const emails = await scrapeEmailsFromWebsite(website);

        // Update the record in MongoDB with emails and mark as scraped
        await Business.findByIdAndUpdate(_id, {
            emails: emails.length > 0 ? emails : business.emails,  // Keep existing emails if none found
            scraped: true,                                         // Mark the business as scraped
            scraped_at: new Date(),                                // Update the scraped_at field
        });

        console.log(`Processed business: ${business.name}, Emails: ${emails}`);
    }
}

export async function GET() {
    try {
        // Start the scraping and updating process
        await scrapeAndUpdateEmailsForBusinesses();
        return NextResponse.json({ message: 'Scraping and updating completed' });
    } catch (error) {
        console.error('Error during scraping and updating:', error);
        return NextResponse.json({ error: 'Error during scraping and updating' }, { status: 500 });
    }
}
