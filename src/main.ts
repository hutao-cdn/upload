import * as core from '@actions/core';
import {CdnClient} from './CdnClient';

async function run() {
    try {
        let token = core.getInput('token') || process.env.SNAP_HUTAO_CDN_TOKEN || '';
        if (!token) {
            core.setFailed('Token is required. Please set the token input or SNAP_HUTAO_CDN_TOKEN environment variable.');
            return;
        }

        let file_path = core.getInput("file_path", {required: true});
        let key = core.getInput("key", {required: true});
        let post_action = core.getInput("post_action") || 'none';

        core.info("Starting Snap Hutao CDN upload with the following parameters:");
        core.info(`File Path: ${file_path}`);
        core.info(`Key: ${key}`);
        core.info(`Post Action: ${post_action}`);

        const cdnClient = new CdnClient(token);

        const uploadUrls = await cdnClient.getUploadUrls(key);
        if (uploadUrls.length === 0) {
            core.setFailed('No upload URLs received from Snap Hutao CDN.');
            return;
        }

        core.info(`Received ${uploadUrls.length} upload URLs from Snap Hutao CDN.`);
        for (let i = 0; i < uploadUrls.length; i++) {
            const url = uploadUrls[i];
            core.info(`Uploading file to URL ${i + 1}/${uploadUrls.length}`);
            await cdnClient.uploadFile(url, file_path);
            core.info(`Uploaded file to URL ${i + 1}/${uploadUrls.length}`);
        }

        core.info(`File ${file_path} uploaded successfully to Snap Hutao CDN with key ${key}.`);

        if (post_action === 'preheat') {
            core.info(`Preheating CDN for key ${key}...`);
            await cdnClient.preheat(key);
            core.info(`CDN preheat triggered successfully for key ${key}.`);
        } else if (post_action === 'refresh') {
            core.info(`Refreshing CDN for key ${key}...`);
            await cdnClient.refresh(key);
            core.info(`CDN refresh triggered successfully for key ${key}.`);
        } else {
            core.info(`No post action specified or action is 'none'. Skipping.`);
        }
    } catch (error) {
        // @ts-ignore
        core.setFailed(`Action failed with error: ${error.message}`);
    }
}

// noinspection JSIgnoredPromiseFromCall
run()