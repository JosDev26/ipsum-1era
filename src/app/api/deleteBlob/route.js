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

        console.log("Nuevo Access Token:", response.data.access_token);
        return response.data.access_token;
    } catch (error) {
        console.error("Error obteniendo el access token en api/deleteBlob/getAccessToken:", error.response?.data);
        return null;
    }
}

async function getDropboxClient() {
    const token = await getAccessToken();
    return new Dropbox({ accessToken: token });
}

export async function DELETE(request) {
    const body = await request.json();
    const pathname = body.pathname;

    const formattedPathname = convertStringFormat(pathname);

    console.log("formattedPathname", formattedPathname);

    try {
        const dbx = await getDropboxClient();
        
        await dbx.filesDeleteV2({
            path: formattedPathname
        });

        return NextResponse.json({ "Succesful Delete": true });
    } catch (error) {
        console.log("Error en api/deleteBlob/DELETE:", error + "Pathname: " + pathname);
        return NextResponse.json({ "Error": true, error: error.message }, { status: 500 });
    }
}

function convertStringFormat(inputString) {
    try {
        // First, handle the special case of spaces around forward slashes
        // by temporarily replacing "space + slash" with a unique marker
        let processed = inputString.replace(/ \//g, "SLASHMARKER");
        
        // Replace all spaces with underscores
        processed = processed.replace(/ /g, '_');
        
        // Restore the forward slashes without spaces
        processed = processed.replace(/SLASHMARKER/g, "/");
        
        return processed;
    } catch (error) {
        console.error("Error al formatear nombres", error, inputString);
    }
}

