import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import { Buckets } from 'aws-sdk/clients/s3';
import { readFileSync, writeFileSync } from 'fs';
import { join, posix } from 'path';
import { v4 as uuidV4 } from 'uuid';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  private readonly client: S3;
  private readonly bucketName = process.env.BUCKET_NAME;

  private readonly localAssetsPath;
  private readonly cloudAssetsPath;
  private readonly downloadPath;

  constructor() {
    this.client = new S3({
      endpoint: process.env.ENDPOINT,
      sslEnabled: process.env.USE_SSL === 'true',
      accessKeyId: process.env.ACCESS_KEY,
      secretAccessKey: process.env.SECRET_ACCESS_KEY,
      region: process.env.REGION,
      s3ForcePathStyle: true,
    });

    this.localAssetsPath = join(process.cwd(), 'assets');
    const now = new Date();
    this.cloudAssetsPath = posix.join(
      `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`,
      uuidV4(),
    );
    this.downloadPath = join(process.cwd(), 'downloads');
  }

  async onModuleInit(): Promise<void> {
    const endpoint = this.client.endpoint;
    this.logger.debug(
      `已连接至对象存储，端点: ${endpoint.protocol}${endpoint.host}`,
    );

    await this.createBucket();
  }

  async createBucket(): Promise<void> {
    console.time('创建存储桶耗时统计');

    try {
      const buckets = await this.listBucket();

      if (buckets.findIndex((x) => x.Name === this.bucketName) === -1) {
        await this.client.createBucket({ Bucket: this.bucketName }).promise();
        this.logger.debug(`创建存储桶 '${this.bucketName}' 成功！`);
      }
    } catch (err) {
      this.logger.error(`创建存储桶失败：${err.message}`, err.stack);
    }

    console.timeEnd('创建存储桶耗时统计');
  }

  async listBucket(): Promise<Buckets> {
    try {
      const result = await this.client.listBuckets().promise();
      return result.Buckets;
    } catch (err) {
      this.logger.error(`获取存储桶失败：${err.message}`, err.stack);
    }
  }

  async getAssets(): Promise<void> {
    console.time('下载图片耗时统计');

    try {
      const key = posix.join(this.cloudAssetsPath, 'iphone.png');

      const result = await this.client
        .getObject({ Bucket: this.bucketName, Key: key })
        .promise();

      writeFileSync(
        join(this.downloadPath, 'iphone.png'),
        result.Body as Buffer,
      );

      this.logger.debug(`下载图片 '${key}' 成功！`);
    } catch (err) {
      this.logger.error(`下载图片失败：${err.message}`, err.stack);
    }

    console.timeEnd('下载图片耗时统计');

    console.time('下载压缩包耗时统计');

    try {
      const key = posix.join(this.cloudAssetsPath, 'public.zip');

      const result = await this.client
        .getObject({ Bucket: this.bucketName, Key: key })
        .promise();

      writeFileSync(
        join(this.downloadPath, 'public.zip'),
        result.Body as Buffer,
      );

      this.logger.debug(`下载压缩包 '${key}' 成功！`);
    } catch (err) {
      this.logger.error(`下载压缩包失败：${err.message}`, err.stack);
    }

    console.timeEnd('下载压缩包耗时统计');
  }

  async putAssets(): Promise<void> {
    console.time('上载图片耗时统计');

    try {
      const key = posix.join(this.cloudAssetsPath, 'iphone.png');
      const buf = readFileSync(join(this.localAssetsPath, 'iphone.png'));

      await this.client
        .putObject({
          Bucket: this.bucketName,
          Key: key,
          Body: buf,
          ContentType: 'image/png, application/octet-stream',
        })
        .promise();

      this.logger.debug(`上载图片 '${key}' 成功！`);
    } catch (err) {
      this.logger.error(`上载图片失败：${err.message}`, err.stack);
    }

    console.timeEnd('上载图片耗时统计');

    console.time('上载压缩包耗时统计');

    try {
      const key = posix.join(this.cloudAssetsPath, 'public.zip');
      const buf = readFileSync(join(this.localAssetsPath, 'public.zip'));

      await this.client
        .putObject({
          Bucket: this.bucketName,
          Key: key,
          Body: buf,
          ContentType: 'application/zip, application/octet-stream',
        })
        .promise();

      this.logger.debug(`上载压缩包 '${key}' 成功！`);
    } catch (err) {
      this.logger.error(`上载压缩包失败：${err.message}`, err.stack);
    }

    console.timeEnd('上载压缩包耗时统计');
  }
}
