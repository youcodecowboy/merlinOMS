"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WashRequestStatus = exports.RequestPriority = exports.RequestStatus = exports.RequestType = exports.BinType = exports.UserRole = void 0;
var client_1 = require("@prisma/client");
// Re-export Prisma enums
exports.UserRole = client_1.Prisma.UserRole, exports.BinType = client_1.Prisma.BinType, exports.RequestType = client_1.Prisma.RequestType, exports.RequestStatus = client_1.Prisma.RequestStatus, exports.RequestPriority = client_1.Prisma.RequestPriority, exports.WashRequestStatus = client_1.Prisma.WashRequestStatus;
