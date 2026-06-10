# Assignment Evidence

This directory contains the named text artifacts requested by the grading
rubric. Screenshot artifacts must be captured while the application is running
so the required route is visible in the browser address bar.

## Demo credentials

- Application user: `demouser`
- Application password: `DemoPass123!`
- Django admin user: `root`
- Django admin password: `RootPass123!`

Change these local demonstration passwords before using the application outside
the assignment environment.

## Screenshot checklist

- Task 12: `admin_login.png`
- Task 13: `admin_logout.png`
- Task 17: `get_dealers.png`
- Task 18: `get_dealers_loggedin.png`
- Task 19: `dealersbystate.png`
- Task 20: `dealer_id_reviews.png`
- Task 21: `dealership_review_submission.png`
- Task 22: `added_review.png`
- Task 25: `deployed_landingpage.png`
- Task 26: `deployed_loggedin.png`
- Task 27: `deployed_dealer_detail.png`
- Task 28: `deployed_add_review.png`

Store screenshots in this directory using the exact names above. For Tasks
18-20 and 25-28, keep the browser address bar visible. Task 18 must also show
the username and Review Dealer option.

## Deployment

Build and push `server/Dockerfile` to a container registry, then run:

```bash
./scripts/deploy.sh <container-image> <django-secret-key>
```

The script writes the live URL to `evidence/deploymentURL` after the
LoadBalancer receives an external address.
