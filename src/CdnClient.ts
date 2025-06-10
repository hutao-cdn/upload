import * as http from '@actions/http-client';
import * as core from '@actions/core';
import * as fs from 'fs-extra';
import {Readable} from 'stream';

export class CdnClient {
    private readonly token: String
    private readonly client: http.HttpClient;

    constructor(token: string) {
        this.token = token;
        this.client = new http.HttpClient('snap-hutao-cdn-client', undefined, {
            socketTimeout: 120 * 1000
        });
    }

    async getUploadUrls(key: String): Promise<string[]> {
        core.info("Fetching upload URLs from Snap Hutao CDN...");

        const body = {
            token: this.token,
            key: key,
        }
        const res = await this.client.post(this.getUrl("/v2/getUploadUrls"), JSON.stringify(body))
            .then(res => res.readBody())
            .then(res => JSON.parse(res));

        if (res.retcode !== 0) {
            throw new Error(`Failed to get upload URLs: ${res.message}`);
        }

        return res.data;
    }

    async uploadFile(url: String, filePath: String): Promise<void> {
        core.info(`Uploading file ${filePath} with key ${key}`);
        const buf = await fs.readFile(filePath);
        const stream = Readable.from(buf);

        const res = await this.client.put(url, stream);
        if (res.message.statusCode !== 200) {
            const error = await res.readBody();
            core.error(`Failed to upload file: ${error}`);
            throw new Error(`Upload failed with status code ${res.message.statusCode}: ${error}`);
        }

        core.info(`File ${filePath} uploaded successfully.`);
    }

    async preheat(key: String): Promise<void> {
        core.info(`Preheating CDN for key ${key}`);
        const body = {
            token: this.token,
            key: key,
        }
        const res = await this.client.post(this.getUrl("/v2/preheat"), JSON.stringify(body))
            .then(res => res.readBody())
            .then(res => JSON.parse(res));

        if (res.retcode !== 0) {
            throw new Error(`Failed to preheat CDN: ${res.message}`);
        }

        core.info(`CDN preheat triggered successfully for key ${key}.`);
    }

    async refresh(key: String): Promise<void> {
        core.info(`Refreshing CDN for key ${key}`);
        const body = {
            token: this.token,
            key: key,
        }
        const res = await this.client.post(this.getUrl("/v2/refresh"), JSON.stringify(body))
            .then(res => res.readBody())
            .then(res => JSON.parse(res));

        if (res.retcode !== 0) {
            throw new Error(`Failed to refresh CDN: ${res.message}`);
        }

        core.info(`CDN refresh triggered successfully for key ${key}.`);
    }

    private getUrl(path: string): string {
        return `https://api.qhy04.com/hutaocdn${path}`;
    }
}