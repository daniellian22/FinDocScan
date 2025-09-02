import cv2
import numpy as np
import matplotlib.pyplot as plt
from sklearn.mixture import GaussianMixture

def extract_text_regions(image_path):
    """Extracts text regions using GMM."""
    # Ensure image loads correctly
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Error: Could not read the image file at {image_path}")

    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Apply threshold to get binary image
    _, binary = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY_INV)

    # Flatten pixels for clustering
    pixels = binary.reshape(-1, 1)

    # Apply GMM for segmentation
    gmm = GaussianMixture(n_components=2, covariance_type='full', max_iter=100)
    gmm.fit(pixels)
    labels = gmm.predict(pixels)

    # Reshape to original image shape
    segmented = labels.reshape(binary.shape)

    # Save the processed image
    processed_path = image_path.replace(".", "_processed.")
    plt.imsave(processed_path, segmented, cmap="gray")

    return processed_path
