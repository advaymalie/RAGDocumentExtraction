# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the dependencies file to the working directory
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
# --no-cache-dir makes the image smaller
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code
COPY . .

# Install a production-grade WSGI server
RUN pip install gunicorn

# Expose the port the app runs on
# We'll use 8000 inside the container
EXPOSE 8000

# Define the command to run the application
# It will run 4 worker processes, listening on all interfaces at port 8000
CMD ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:8000", "app:app"]