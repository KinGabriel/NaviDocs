# NaviDocs
NaviDocs is a web-based platform designed to streamline how academic and administrative documents are created, approved, and managed at Saint Louis University. 

The platform centralizes template creation, automates version control, and supports role-based approvals, from Department Heads to Document Controllers, making it easier for faculty and staff to work with updated, standardized documents. With features such as submission bins, real-time status tracking, protected templates, and a built-in text editor optimized for academic formats, NaviDocs enhances collaboration while preserving the university’s existing hierarchy and processes. 

Through an organized, secure, and fully traceable workflow, NaviDocs helps SLU maintain quality, reduce errors, and support a more efficient document lifecycle across all units.

## Docker Commands for Deployment and Update
Production Deployment (DigitalOcean)
* Set all URLs to your deployed domain (e.g., https://navidocs.online).
* Use MongoD

After configuring all .env files and building the required images, NaviDocs is deployed and updated using Docker Compose on the DigitalOcean Droplet. The following commands are used to stop, rebuild, and restart the entire system stack:
1. **Creates the Docker images based on the Dockerfiles**
   ```bash
   docker compose build
2. **Creates containers from the built images and runs them in detached mode.**.
    ```bash
   docker compose up -d
3. **Stop all running containers without deleting them.**.
   ```bash
   docker compose down
4. **Rebuild all running containers defined in the docker-compose.yml**.
   ```bash
   docker compose build --no-cache
If updates are made to the NaviDocs system, such as modifications to the codebase, Dockerfiles, or environment variables, the sequence of stopping, rebuilding, and running the containers must be repeated to ensure all changes are fully applied.

## Support
For help, please contact navidocscapstone@gmail.com.

## Authors and acknowledgment
Developed by the **Kalapache Team**.  
- Abitan, Julianne Therese
- Aquino, Jan Dolby
- Cahanap, Jerilyn Louise
- Caparas, Joaquin Gabriel
- Escano, Nichole Jhoy
- Mandac, Minette Victoria
- Malaluan, Arvin
- San Miguel, Chloe' Lee
