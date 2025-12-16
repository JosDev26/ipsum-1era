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
    console.error("Error obteniendo el access token:", error.response?.data);
    return null;
  }
}

async function getDropboxClient() {
  const token = await getAccessToken();
  console.log(token);
  return new Dropbox({ accessToken: token });
}

async function getOrCreateSharedLink(dbx, path) {
  try {
    // First, try to get existing shared links
    const existingLinks = await dbx.sharingListSharedLinks({
      path,
      direct_only: true
    });

    if (existingLinks.result.links && existingLinks.result.links.length > 0) {
      // If a shared link exists, return it
      return existingLinks.result.links[0];
    }

    // If no shared link exists, create a new one
    const newLink = await dbx.sharingCreateSharedLinkWithSettings({
      path: path,
      settings: {
        requested_visibility: { '.tag': 'public' }
      }
    });
    return newLink.result;
  } catch (error) {
    console.error('Error in api/getFiles/getOrCreateSharedLink:', error);
    throw error;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get("prefix");
  const formattedPrefix = convertStringFormat(prefix);

  try {
    const dbx = await getDropboxClient();
    
    const result = await dbx.filesListFolder({
      path: `/${formattedPrefix}`
    });

    const files = await Promise.all(result.result.entries.map(async (entry) => {
      if (entry['.tag'] === 'file') {
        try {
          const sharedLinkResponse = await getOrCreateSharedLink(dbx, entry.path_lower);
          const fileUrl = sharedLinkResponse.url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');

          return {
            name: entry.name,
            size: entry.size,
            type: entry['.tag'],
            url: fileUrl,
            pathname: entry.path_display
          };
        } catch (error) {
          console.error(`Error processing file ${entry.name}:`, error);
          return null;
        }
      }
      return null;
    }));

    const validFiles = files.filter(file => file !== null);

    return NextResponse.json({ files: validFiles });
  } catch (error) {
    if (error.status === 409) {
      console.log('No es un error: La ruta no existe', error);
      return NextResponse.json({ msg: "La ruta no existe", route_not_found: true });
    } else {
      console.error('Error in GET route:', error);
      return NextResponse.json({ message: 'Error fetching files', error: error.message }, { status: 500 });
    }
  }
}

function convertStringFormat(inputString) {
  // First, handle the special case of spaces around forward slashes
  // by temporarily replacing "space + slash" with a unique marker
  let processed = inputString.replace(/ \//g, "SLASHMARKER");
  
  // Replace all spaces with underscores
  processed = processed.replace(/ /g, '_');
  
  // Restore the forward slashes without spaces
  processed = processed.replace(/SLASHMARKER/g, "/");
  
  return processed;
}
