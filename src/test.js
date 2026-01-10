const robosatsClient = require('./robosatsClient');
const { formatOffer } = require('./messageFormatter');
const config = require('./config');
const logger = require('./logger');

async function test() {
  console.log('======================================');
  console.log('Testing Robosats API connection...');
  console.log('======================================');
  
  if (config.ROBOSATS_USE_MOCK) {
    console.log('⚠️  MOCK MODE - Using fake data for testing');
    console.log('Set ROBOSATS_USE_MOCK=false for real API');
  } else {
    console.log('API URL:', config.ROBOSATS_API_URL);
  }
  console.log('======================================\n');

  try {
    // Test 1: Get exchange info
    console.log('Test 1: Fetching exchange info...');
    const info = await robosatsClient.getInfo();
    console.log('✓ Connection successful!');
    console.log('Exchange info:', {
      num_public_buy_orders: info.num_public_buy_orders,
      num_public_sell_orders: info.num_public_sell_orders,
      active_robots_today: info.active_robots_today,
      network: info.network
    });

    // Test 2: Get order book
    console.log('\nTest 2: Fetching order book...');
    const offers = await robosatsClient.getOffers();
    console.log(`✓ Found ${offers.length} public offers`);
    
    if (offers.length > 0) {
      console.log('\nSample offers:');
      offers.slice(0, 3).forEach((offer, i) => {
        console.log(`\nOffer ${i + 1}:`, {
          id: offer.id,
          type: offer.type === 0 ? 'BUY' : 'SELL',
          currency: offer.currency,
          payment_method: offer.payment_method,
          premium: offer.premium,
          amount: offer.amount
        });
      });

      console.log('\n\nFormatted WhatsApp messages (first 2 offers):');
      console.log('======================================');
      offers.slice(0, 2).forEach((offer, i) => {
        console.log(`\nMessage ${i + 1}:`);
        console.log(formatOffer(offer));
      });
      console.log('======================================');
    } else {
      console.log('No offers found in the order book');
    }

    console.log('\n✓ All tests passed!\n');
  } catch (error) {
    console.error('\n✗ Test failed!');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

test();
