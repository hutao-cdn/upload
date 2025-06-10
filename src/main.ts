import * as core from '@actions/core';
import {CdnClient} from './CdnClient';
import * as fs from 'fs-extra';

async function run() {
    try {
        let token = core.getInput('token') || process.env.SNAP_HUTAO_CDN_TOKEN || '';
        if (!token) {
            core.setFailed('Token is required. Please set the token input or SNAP_HUTAO_CDN_TOKEN environment variable.');
            return;
        }

        let file_path = core.getInput("file_path", {required: true}).replace(/\/$/, '');
        let key = core.getInput("key") || file_path.split('/').pop() || '';
        let post_action = core.getInput("post_action") || 'none';

        core.info("Starting Snap Hutao CDN upload with the following parameters:");
        core.info(`File Path: ${file_path}`);
        core.info(`Key: ${key}`);
        core.info(`Post Action: ${post_action}`);

        const cdnClient = new CdnClient(token);

        const stats = await fs.stat(file_path);
        if (stats.isDirectory()) {
            core.info(`The provided file path is a directory: ${file_path}`);
            key = file_path.split('/').pop() || '';
            core.warning(`Custom key is ignored, current key is set to the last part of the directory path: ${key}`);
            await cdnClient.uploadDir(file_path, key);
        } else if (stats.isFile()) {
            core.info(`The provided file path is a file: ${file_path}`);
            await cdnClient.uploadFile(file_path, key);
        } else {
            core.setFailed(`The provided file path is neither a file nor a directory: ${file_path}`);
            return;
        }

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