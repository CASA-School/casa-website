import {NextResponse} from 'next/server';

import type {ApiResponse} from '@/types/domain';

export const apiSuccess = <T>(data: T, status = 200) =>
  NextResponse.json<ApiResponse<T>>(
    {
      data,
      error: null,
    },
    {status},
  );

export const apiError = (code: string, message: string, status: number) =>
  NextResponse.json<ApiResponse<null>>(
    {
      data: null,
      error: {
        code,
        message,
      },
    },
    {status},
  );
