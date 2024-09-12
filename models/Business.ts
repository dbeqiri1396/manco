// models/Business.ts
import mongoose, { Schema, Document } from 'mongoose';

// Interface for TypeScript
export interface IBusiness extends Document {
    name: string;
    address: string;
    phone_number: string;
    website: string;
    emails: string[];
    rating: number;
    user_ratings_total: number;
    place_id: string;
    scraped_at: Date;
    scraped: boolean; // New field to track scraping status
}

// Define the Mongoose schema
const BusinessSchema: Schema = new Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone_number: { type: String },
    website: { type: String },
    emails: { type: [String], required: true },
    rating: { type: Number },
    user_ratings_total: { type: Number },
    place_id: { type: String, unique: true },
    scraped_at: { type: Date, default: Date.now },
    scraped: { type: Boolean, default: false }, // New field with default value of false
});

// Export the model
export default mongoose.models.Business || mongoose.model<IBusiness>('Business', BusinessSchema);
