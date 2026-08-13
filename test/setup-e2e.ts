import * as dotenv from 'dotenv';

// Load the isolated test environment variables before the NestJS app initializes.
dotenv.config({ path: '.env.test' });
