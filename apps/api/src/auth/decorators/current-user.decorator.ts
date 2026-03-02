import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@dbnexus/metadata';

export const CurrentUser = createParamDecorator(
    (data: keyof User | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as User | undefined;

        if (!user) return null;

        return data ? user[data] : user;
    }
);
