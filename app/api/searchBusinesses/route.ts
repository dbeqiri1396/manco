import { NextResponse } from 'next/server';
import axios from 'axios';
import dbConnect from '../../../utils/mongoose'; // Mongoose connection
import Business from '../../../models/Business'; // Business model
import puppeteer from 'puppeteer';

interface BusinessDetails {
    place_id: string;
    name: string;
    formatted_address: string;
    formatted_phone_number: string;
    website: string;
    rating: number;
    user_ratings_total: number;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const businessType = searchParams.get('businessType');
    const radius = searchParams.get('radius');
    const location = searchParams.get('location');

    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!businessType || !radius || !location) {
        return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
    }

    let allBusinesses: BusinessDetails[] = [];
    let nextPageToken: string | undefined;
    let pageCount = 0;

    try {
        // Connect to MongoDB via Mongoose
        await dbConnect();
        console.log("Connected to MongoDB");

        do {
            const placesApiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${businessType}&key=${googleMapsApiKey}` +
                (nextPageToken ? `&pagetoken=${nextPageToken}` : '');

            const placesResponse = await axios.get(placesApiUrl);
            const businesses = placesResponse.data.results;

            // Add the results to the array
            allBusinesses = allBusinesses.concat(businesses);

            // Check if there's a next page
            nextPageToken = placesResponse.data.next_page_token;
            pageCount++;

            // Wait a short time before requesting the next page token
            if (nextPageToken && pageCount < 3) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // API requires a short delay before using next_page_token
            }

        } while (nextPageToken && pageCount < 3);

        const businessesWithEmails = await Promise.all(
            allBusinesses.map(async (business: BusinessDetails) => {
                const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${business.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total&key=${googleMapsApiKey}`;
                const detailsResponse = await axios.get(placeDetailsUrl);
                const details = detailsResponse.data.result;

                let emails: string[] = ['No website available'];
                if (details.website) {
                    emails = await scrapeEmails(details.website);
                }

                const businessData = {
                    name: details.name || 'No name available',
                    address: details.formatted_address || 'No address available',
                    phone_number: details.formatted_phone_number || 'No phone number available',
                    website: details.website || 'No website available',
                    emails,
                    rating: details.rating || 0,
                    user_ratings_total: details.user_ratings_total || 0,
                    place_id: business.place_id,
                    scraped_at: new Date(),
                };

                // Insert or update the business document in MongoDB
                await Business.findOneAndUpdate(
                    { place_id: business.place_id },
                    businessData,
                    { upsert: true, new: true }
                );

                return businessData;
            })
        );

        return NextResponse.json({ businesses: businessesWithEmails });
    } catch (error) {
        console.error('Error fetching data from Google Maps API:', error);
        return NextResponse.json({ error: 'Error fetching data' }, { status: 500 });
    }
}

async function scrapeEmails(website: string): Promise<string[]> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    let emails: string[] = [];

    try {
        // Visit the website using Puppeteer
        await page.goto(website, { waitUntil: 'networkidle2' });

        // Get the page content (HTML)
        const content = await page.content();

        // Regular expression to find email addresses
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        emails = content.match(emailRegex) || [];

    } catch (error) {
        console.error('Error scraping emails from website:', website, error);
    } finally {
        // Ensure the browser is closed after use
        await browser.close();
    }

    return emails;
}
