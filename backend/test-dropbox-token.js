require('dotenv').config();
const Dropbox = require('dropbox').Dropbox;

async function testDropboxToken() {
  console.log('\n🔍 Testing Dropbox Token...\n');

  const token = process.env.DROPBOX_ACCESS_TOKEN;

  if (!token) {
    console.error('❌ ERROR: DROPBOX_ACCESS_TOKEN not found in .env');
    return;
  }

  console.log(`✅ Token found: ${token.substring(0, 20)}...`);

  const dbx = new Dropbox({ accessToken: token });

  try {
    // Test 1: Get current account
    console.log('\n📋 Test 1: Getting account info...');
    const account = await dbx.usersGetCurrentAccount();
    console.log(`✅ Account: ${account.result.name.display_name}`);
    console.log(`✅ Email: ${account.result.email}`);

    // Test 2: Try to upload a small test file
    console.log('\n📤 Test 2: Testing file upload...');
    const testContent = 'Test file from Grabadora IA';
    const uploadResult = await dbx.filesUpload({
      path: '/test_upload.txt',
      contents: testContent,
      mode: { '.tag': 'overwrite' },
    });
    console.log(`✅ File uploaded: ${uploadResult.result.path_display}`);

    // Test 3: Try to create shared link
    console.log('\n🔗 Test 3: Testing shared link creation...');
    try {
      const linkResult = await dbx.sharingCreateSharedLinkWithSettings({
        path: uploadResult.result.path_display,
      });
      console.log(`✅ Shared link created: ${linkResult.result.url}`);
    } catch (linkError) {
      if (
        linkError.error &&
        linkError.error.error &&
        linkError.error.error['.tag'] === 'shared_link_already_exists'
      ) {
        console.log('✅ Shared link already exists (this is OK)');
      } else {
        throw linkError;
      }
    }

    console.log('\n✅ ALL TESTS PASSED! Token has correct permissions.\n');
  } catch (error) {
    console.error('\n❌ ERROR:', error.error || error.message);
    if (error.status) {
      console.error(`Status: ${error.status}`);
    }
    if (error.error && error.error.error_summary) {
      console.error(`Error summary: ${error.error.error_summary}`);
    }
    console.log('\n🔧 SOLUTION:');
    console.log('1. Go to https://www.dropbox.com/developers/apps');
    console.log('2. Select your app');
    console.log('3. Go to "Permissions" tab');
    console.log(
      '4. Enable: files.metadata.write, files.content.write, files.content.read, sharing.write',
    );
    console.log('5. Click "Submit"');
    console.log('6. Go to "Settings" tab');
    console.log('7. Generate NEW token');
    console.log('8. Update .env file\n');
  }
}

testDropboxToken();
