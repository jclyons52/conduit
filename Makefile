OTP ?=

.PHONY: publish

publish:
	cd packages/di && pnpm publish --access public --no-git-checks --otp=$(OTP)
	cd ../cli && pnpm publish --access public --no-git-checks --otp=$(OTP)