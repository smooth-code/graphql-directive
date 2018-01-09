echo "Building"
yarn build

echo "Linting"
yarn lint

echo "Installing graphql@^0.12"
yarn add graphql@^0.12

echo "Running tests on graphql@^0.12"
yarn test

echo "Installing graphql ^0.11"
yarn add graphql@^0.11

echo "Running tests on graphql@^0.11"
yarn test --coverage && codecov
