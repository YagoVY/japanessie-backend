require('dotenv').config();

console.log('Environment Variables:');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME);
console.log('PRINTFUL_API_KEY:', process.env.PRINTFUL_API_KEY ? 'SET' : 'NOT SET');
console.log('PRINTFUL_STORE_ID:', process.env.PRINTFUL_STORE_ID);
