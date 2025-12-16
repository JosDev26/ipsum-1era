import { NextResponse } from 'next/server';
import { Dropbox } from 'dropbox';
import axios from 'axios';

const CLIENT_ID = process.env.DROPBOX_CLIENT_ID;
const CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.DROPBOX_REFRESH_TOKEN;

async function getAccessToken() {
  try {
    const response = await axios.post("https://api.dropbox.com/oauth2/token", new URLSearchParams({
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    }).toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    return response.data.access_token;
  } catch (error) {
    console.error("Error obteniendo el access token en api/uploadFile:", error.response?.data);
    return null;
  }
}

async function getDropboxClient() {
  const token = await getAccessToken();
  return new Dropbox({ accessToken: token });
}

// Function to create a new folder
async function createFolder(dbx, folderName) {
  try {
    const result = await dbx.filesCreateFolderV2({
      path: folderName,
      autorename: true
    });
    return result;
  } catch (error) {
    console.error("Error creando el folder en createFolder", folderName, error);
    throw error;
  }
}

export async function POST(req) {
  if (req.method !== 'POST') {
    return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
  }

  try {
    const dbx = await getDropboxClient();
    const formData = await req.formData();

    const file = formData.get('file');
    const name = formData.get('name');
    const directory = formData.get('directory');
    const rootName = formData.get('rootName');
    
    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    const rootNameFormatted = formatString(rootName);
    const directoryFormatted = formatString(directory);

    // Get folder name
    const folderPath = `/${rootNameFormatted}/${directoryFormatted}`;

    // Check if folder exists, create if not
    try {
      await dbx.filesListFolder({ path: folderPath });
    } catch (err) {
      if (err.status === 409) {
        await createFolder(dbx, folderPath);
      }
    }

    const fileName = `${folderPath}/${name}`;

    // Upload file
    const uploadResult = await dbx.filesUpload({
      path: fileName,
      contents: fileBuffer,
      mode: { '.tag': 'add' },
      autorename: true
    });

    console.log(uploadResult);

    let sharedLinkResponse;
    try {
      // Try to create a new shared link
      const createLinkResult = await dbx.sharingCreateSharedLinkWithSettings({
        path: fileName,
        settings: {
          requested_visibility: { '.tag': 'public' }
        }
      });
      sharedLinkResponse = createLinkResult.result;
    } catch (error) {
      // If the shared link already exists, get the existing one
      if (error.error?.error?.['.tag'] === 'shared_link_already_exists') {
        const existingLinks = await dbx.sharingListSharedLinks({
          path: fileName,
          direct_only: true
        });
        if (existingLinks.result.links && existingLinks.result.links.length > 0) {
          sharedLinkResponse = existingLinks.result.links[0];
        } else {
          throw new Error('No existing shared link found');
        }
      } else {
        throw error;
      }
    }

    const fileUrl = sharedLinkResponse.url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');

    return NextResponse.json({
      name: file.name,
      size: file.size,
      type: file.type,
      url: fileUrl,
      folder: folderPath,
      ok: true
    });
  } catch (error) {
    console.error('Error in upload route en api/uploadFile/Post:', error);
    return NextResponse.json({ message: 'Error uploading file', error: error.message }, { status: 500 });
  }
}

function formatString(str) {
  // First trim the string to remove trailing spaces
  const trimmed = str.trim();
  
  // Then replace all spaces with underscores
  const formatted = trimmed.replace(/ /g, '_');
  
  return formatted;
}
