import React, { useState } from 'react';

/* ========= 型定義 ========= */

type Role =
  | 'MASTER'
  | 'OWNER'
  | 'MANAGER'
  | 'SUB_MANAGER'
  | 'SHIFT_LEAD'
  | 'STAFF';

type Store = {
  code: string;
  name: string;
};

type User = {
  id: string;
  name: string;
  role: Role;
  storeCode?: string;
  responsibilityNumber?: string;
  password: string;
};

type ErrorReport = {
  id: string;
  storeCode?: string;
  userId?: string;
  role?: Role;
  errorCode: string;
  message: string;
  createdAt: string;
  autoRecoveryTried: boolean;
  autoRecoveryResult?: 'SUCCESS' | 'FAILED';
};

type AppError = Error & { code?: string };

/* ========= 仮データ ========= */

const stores: Store[] = [
  { code: '12345', name: '舟入店' },
  { code: '67890', name: '羽衣店' },
];

const users: User[] = [
  {
    id: 'master-1',
    name: 'マスター',
    role: 'MASTER',
    password: 'master',
  },
  {
    id: 'owner-1',
    name: 'オーナー（舟入・羽衣）',
    role: 'OWNER',
    storeCode: 'MULTI',
    responsibilityNumber: '01',
    password: 'owner',
  },
  {
    id: 'manager-funairi',
    name: '舟入 店長',
    role: 'MANAGER',
    storeCode: '12345',
    responsibilityNumber: '02',
    password: 'funairi',
  },
  {
    id: 'manager-hagoromo',
    name: '羽衣 店長',
    role: 'MANAGER',
    storeCode: '67890',
    responsibilityNumber: '02',
    password: 'hagoromo',
  },
  {
    id: 'staff-funairi-1',
    name: '舟入 スタッフA',
    role: 'STAFF',
    storeCode: '12345',
    responsibilityNumber: '11',
    password: 'staff',
  },
];

let errorReports: ErrorReport[] = [];

/* ========= ユーティリティ ========= */

const makeError = (code: string, message: string): AppError => {
  const e = new Error(message) as AppError;
  e.code = code;
  return e;
};

const generateErrorCode = () => {
  const now = new Date();
  const ymd =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `ERR-${ymd}-${rand}`;
};

/* ========= ログインロジック ========= */

async function login(input: {
  storeCode?: string;
  responsibilityNumber?: string;
  password: string;
}): Promise<User> {
  const { storeCode, responsibilityNumber, password } = input;

  // マスター専用ルート
  if (!storeCode && !responsibilityNumber) {
    const master = users.find(u => u.role === 'MASTER');
    if (!master) throw makeError('MASTER_NOT_FOUND', 'マスターが登録されていません');
    if (password !== master.password) {
      throw makeError('INVALID_MASTER_PASSWORD', 'マスターパスワードが違います');
    }
    return master;
  }

  // 通常ログイン
  if (!storeCode || !responsibilityNumber) {
    throw makeError('MISSING_FIELDS', '店舗コードと責任者番号を入力してください');
  }

  const user = users.find(
    u => u.storeCode === storeCode && u.responsibilityNumber === responsibilityNumber
  );
  if (!user) throw makeError('USER_NOT_FOUND', 'ユーザーが見つかりません');

  if (password !== user.password) {
    throw makeError('INVALID_PASSWORD', 'パスワードが違います');
  }

  return user;
}

/* ========= 自動復旧・レポート ========= */

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

async function autoRecover(error: AppError): Promise<{
  success: boolean;
  action?: 'RETRY' | 'RELOGIN_REQUIRED';
}> {
  if (error.code === 'SESSION_EXPIRED') {
    return { success: true, action: 'RELOGIN_REQUIRED' };
  }
  if (error.code === 'NETWORK_ERROR') {
    await wait(500);
    return { success: true, action: 'RETRY
