/**
 * Local test script for Instagram authentication
 * Run with: node test-instagram-auth.js
 */

const { IgApiClient } = require('instagram-private-api');

const ig = new IgApiClient();

async function testInstagramAuth() {
  try {
    console.log('🔧 Testing Instagram Authentication...\n');

    // Generate device based on username
    const username = process.env.INSTAGRAM_USERNAME || 'the_vows_social';
    ig.state.generateDevice(username);
    console.log(`✓ Generated device for: ${username}`);

    // Test 1: Try Facebook login
    const fbPhone = process.env.INSTAGRAM_FB_PHONE || '0408409582';
    const fbPassword = process.env.INSTAGRAM_FB_PASSWORD || 'u2U88_Y3}&C5:v#V';

    if (fbPhone && fbPassword) {
      console.log('\n📱 Attempting Facebook login...');
      console.log(`Phone: ${fbPhone.substring(0, 4)}****`);

      try {
        await ig.account.loginWithFacebook(fbPhone, fbPassword);
        console.log('✅ Facebook login successful!');

        // Test fetching posts
        console.log('\n📸 Testing post fetch...');
        const userId = await ig.user.getIdByUsername('the_vows_social');
        const userFeed = ig.feed.user(userId);
        const posts = await userFeed.items();

        console.log(`✅ Successfully fetched ${posts.length} posts`);
        if (posts.length > 0) {
          console.log(`First post: ${posts[0].caption?.text?.substring(0, 50)}...`);
        }

        return { success: true, method: 'facebook' };
      } catch (fbError) {
        console.log(`❌ Facebook login failed: ${fbError.message}`);
        console.log('Full error:', fbError);
      }
    }

    // Test 2: Try regular Instagram login
    const igUsername = process.env.INSTAGRAM_USERNAME || 'the_vows_social';
    const igPassword = process.env.INSTAGRAM_PASSWORD || 'T8oy$%!&1xDFfX';

    console.log('\n🔐 Attempting Instagram login...');
    console.log(`Username: ${igUsername}`);

    try {
      await ig.account.login(igUsername, igPassword);
      console.log('✅ Instagram login successful!');

      // Test fetching posts
      console.log('\n📸 Testing post fetch...');
      const userId = await ig.user.getIdByUsername('the_vows_social');
      const userFeed = ig.feed.user(userId);
      const posts = await userFeed.items();

      console.log(`✅ Successfully fetched ${posts.length} posts`);
      if (posts.length > 0) {
        console.log(`First post: ${posts[0].caption?.text?.substring(0, 50)}...`);
      }

      return { success: true, method: 'instagram' };
    } catch (igError) {
      console.log(`❌ Instagram login failed: ${igError.message}`);
      console.log('Full error:', igError);
      return { success: false, error: igError.message };
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
testInstagramAuth()
  .then(result => {
    console.log('\n' + '='.repeat(50));
    if (result.success) {
      console.log(`✅ SUCCESS! Authenticated via ${result.method}`);
    } else {
      console.log('❌ FAILED! Could not authenticate.');
      console.log('Error:', result.error);
    }
    console.log('='.repeat(50));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
