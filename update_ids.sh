#!/bin/bash

# Script to replace all 'id: string' with 'id: number' in service and controller files

echo "Updating service files..."

# Find all .service.ts files and replace 'id: string' with 'id: number'
find /Users/zkalandarov/Documents/backend-nestjs/src -name "*.service.ts" -type f -exec sed -i '' 's/id: string/id: number/g' {} \;

# Find all .service.ts files and replace 'userId: string' with 'userId: number'
find /Users/zkalandarov/Documents/backend-nestjs/src -name "*.service.ts" -type f -exec sed -i '' 's/userId: string/userId: number/g' {} \;

# Find all .service.ts files and replace 'centerId: number' with 'centerId: number'
find /Users/zkalandarov/Documents/backend-nestjs/src -name "*.service.ts" -type f -exec sed -i '' 's/centerId: number/centerId: number/g' {} \;

# Find all .service.ts files and replace 'roleId: string' with 'roleId: number'
find /Users/zkalandarov/Documents/backend-nestjs/src -name "*.service.ts" -type f -exec sed -i '' 's/roleId: string/roleId: number/g' {} \;

echo "Service files updated!"
echo "Updating controller files..."

# Find all .controller.ts files and replace '@Param('id') id: string' with '@Param('id', ParseIntPipe) id: number'
find /Users/zkalandarov/Documents/backend-nestjs/src -name "*.controller.ts" -type f -exec sed -i '' "s/@Param('id') id: string/@Param('id', ParseIntPipe) id: number/g" {} \;

# Find all .controller.ts files and replace '@Param('centerId') centerId: number' with '@Param('centerId', ParseIntPipe) centerId: number'
find /Users/zkalandarov/Documents/backend-nestjs/src -name "*.controller.ts" -type f -exec sed -i '' "s/@Param('centerId') centerId: number/@Param('centerId', ParseIntPipe) centerId: number/g" {} \;

echo "Controller files updated!"
echo "Done!"
