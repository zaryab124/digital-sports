const fs = require('fs');

const part1 = `'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Shield, Users, UserPlus, Calendar, Trophy, FileText,
  DollarSign, ArrowRightLeft, Settings, Plus, CheckCircle2,
  XCircle, Clock, MapPin, Phone, Mail, AlertTriangle, Trash2
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

type CaptainTab =
  | 'my-team'
  | 'players'
  | 'requests'
  | 'matches'
  | 'results'
  | 'scorebook'
  | 'performance'
  | 'payments'
  | 'transfers'
  | 'settings';
`;

fs.writeFileSync('src/app/captain/page.tsx', part1, 'utf8');
console.log('Wrote part1');
