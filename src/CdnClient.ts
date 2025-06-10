import * as http from '@actions/http-client';
import * as core from '@actions/core';
import * as fs from 'fs-extra';

export class CdnClient {
    private readonly token: String
    private readonly client: http.HttpClient;

    constructor(token: string) {
        this.token = token;
        this.client = new http.HttpClient('snap-hutao-cdn-client', undefined, {
            socketTimeout: 120 * 1000
        });
    }

    async getUploadUrls(key: string): Promise<string[]> {
        core.info("Fetching upload URLs from Snap Hutao CDN...");

        const header = {
            'Content-Type': 'application/json'
        }
        const body = {
            token: this.token,
            key: key,
        }
        const res = await this.client.post(this.getUrl("/v2/getUploadUrls"), JSON.stringify(body), header)
            .then(res => res.readBody())
            .then(res => JSON.parse(res));

        if (res.retcode !== 0) {
            throw new Error(`Failed to get upload URLs: ${res.message}`);
        }

        return res.data;
    }

    async uploadFile(url: string, filePath: string): Promise<void> {
        const fileSize = await fs.stat(filePath).then(stat => stat.size);
        const stream = fs.createReadStream(filePath);

        let uploadedBytes = 0;
        let lastReportedProgress = 0;
        const progressInterval = 10;

        stream.on('data', (chunk) => {
            uploadedBytes += chunk.length;
            const progress = Math.floor((uploadedBytes / fileSize) * 100);
            if (progress - lastReportedProgress >= progressInterval || progress === 100) {
                core.info(`Upload progress: ${progress}% (${uploadedBytes}/${fileSize} bytes)`);
                lastReportedProgress = progress;
            }
        })

        const header = {
            'Content-Type': 'application/octet-stream',
        }
        // @ts-ignore
        const res = await this.client.put(url, stream, header);
        if (res.message.statusCode !== 200) {
            const error = await res.readBody();
            core.error(`Failed to upload file: ${error}`);
            throw new Error(`Upload failed with status code ${res.message.statusCode}: ${error}`);
        }
    }

    async preheat(key: string): Promise<void> {
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

    async refresh(key: string): Promise<void> {
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