/*
 * G4IT
 * Copyright 2023 Sopra Steria
 *
 * This product includes software developed by
 * French Ecological Ministery (https://gitlab-forge.din.developpement-durable.gouv.fr/pub/numeco/m4g/numecoeval)
 */
package com.soprasteria.g4it.backend.apifiles.business;

import com.azure.storage.blob.models.BlobStorageException;
import com.soprasteria.g4it.backend.apibatchloading.mapper.FileDescriptionRestMapper;
import com.soprasteria.g4it.backend.apiuser.business.OrganizationService;
import com.soprasteria.g4it.backend.common.filesystem.business.FileStorage;
import com.soprasteria.g4it.backend.common.filesystem.business.FileSystem;
import com.soprasteria.g4it.backend.common.filesystem.model.FileFolder;
import com.soprasteria.g4it.backend.common.utils.Constants;
import com.soprasteria.g4it.backend.common.utils.SanitizeUrl;
import com.soprasteria.g4it.backend.exception.BadRequestException;
import com.soprasteria.g4it.backend.server.gen.api.dto.FileDescriptionRest;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class FileSystemService {

    private static final int REPLACEMENT_CHAR = 65533;
    /**
     * Content types.
     */
    private static final List<String> TYPES = List.of("text/csv", "application/vnd.ms-excel");
    /**
     * File System.
     */
    @Autowired
    private FileSystem fileSystem;
    /**
     * File System.
     */
    @Autowired
    private FileDescriptionRestMapper fileDescriptionRestMapper;

    @Autowired
    private OrganizationService organizationService;
    @Value("${local.working.folder}")
    private String localWorkingFolder;

    @PostConstruct
    public void initFolder() throws IOException {
        Files.createDirectories(Path.of(localWorkingFolder, "input", "inventory"));
    }

    /**
     * List files of subscriber and organization in INPUT directory
     *
     * @param subscriber     the subscriber
     * @param organizationId the organization's id
     * @return the list of files
     */
    public List<FileDescriptionRest> listFiles(final String subscriber, final Long organizationId) throws IOException {
        return fileDescriptionRestMapper.toDto(fetchStorage(subscriber, organizationId.toString()).listFiles(FileFolder.INPUT));
    }

    /**
     * List files of subscriber and organization in INPUT directory
     *
     * @param subscriber     the subscriber
     * @param organizationId the organization's id
     * @return the list of files
     */
    public List<FileDescriptionRest> listFiles(final String subscriber, final Long organizationId, final FileFolder fileFolder) throws IOException {
        return fileDescriptionRestMapper.toDto(fetchStorage(subscriber, organizationId.toString()).listFiles(fileFolder));
    }

    /**
     * List files of subscriber and organization in INPUT directory
     *
     * @return the list of files
     */
    @Cacheable("listTemplatesFiles")
    public List<FileDescriptionRest> listTemplatesFiles() throws IOException {
        return fileDescriptionRestMapper.toDto(
                fetchStorage(Constants.INTERNAL_SUBSCRIBER, String.valueOf(Constants.INTERNAL_ORGANIZATION))
                        .listFiles(FileFolder.TEMPLATE)
        );
    }

    /**
     * List files of subscriber and organization in INPUT directory
     *
     * @param subscriber     the subscriber
     * @param organizationId the organizationId
     * @return the list of files
     */
    public InputStream downloadFile(final String subscriber, final Long organizationId, final FileFolder fileFolder, final String filename) throws IOException {
        return fetchStorage(subscriber, organizationId.toString()).readFile(fileFolder, filename);
    }


    /**
     * Manage files :
     * - check files
     * - get fileStorage
     * - upload each file into fileStorage
     *
     * @param subscriber     the subscriber
     * @param organizationId the organization's id
     * @param files          the list of file
     * @return the fileName list uploaded
     */
    public List<String> manageFiles(final String subscriber, final Long organizationId, final List<MultipartFile> files) {
        if (files == null) return List.of();
        checkFiles(files);
        FileStorage fileStorage = fetchStorage(subscriber, organizationId.toString());
        return files.stream().map(file -> this.uploadFile(file, fileStorage)).toList();
    }

    /**
     * Check files types, throws a BadRequestException when one type is wrong
     *
     * @param files the input files
     * @throws BadRequestException when one type is wrong
     */
    private void checkFiles(final List<MultipartFile> files) {
        if (files == null) return;

        files.stream()
                .filter(file -> !TYPES.contains(file.getContentType()))
                .findFirst()
                .ifPresent(wrongFile -> {
                    throw new BadRequestException(
                            wrongFile.getOriginalFilename(),
                            String.format("Format is not in types %s. Actual type is %s", TYPES, wrongFile.getContentType())
                    );
                });

    }

    /**
     * Retrieve the storage associated with organization
     *
     * @param subscriber   the client subscriber.
     * @param organization the organization as known by G4IT
     * @return the filestorage associated with this subscriber
     * @throws ResponseStatusException Not Found if storage is unknown
     */
    private FileStorage fetchStorage(final String subscriber, final String organization) {
        final FileStorage storage = fileSystem.mount(subscriber, organization);
        if (storage == null) {
            log.info("No storage found for organization {}", organization);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Storage not found for organization " + organization);
        }
        return storage;
    }

    /**
     * Puts file on file storage for an organization.
     *
     * @param file        the file to put.
     * @param fileStorage the fileStorage
     * @return the file path.
     */
    private String uploadFile(final MultipartFile file, final FileStorage fileStorage) {
        final Path tempPath = Path.of(localWorkingFolder, "input", "inventory", UUID.randomUUID().toString());
        try {
            BufferedReader br = getBufferedReader(file);
            // if the encoding was not utf8, we open the file again with an encoding adapted to ANSI
            File outputFile = tempPath.toFile();
            try (Writer out = new BufferedWriter(new OutputStreamWriter(
                    new FileOutputStream(outputFile), StandardCharsets.UTF_8))) {
                String line;
                while ((line = br.readLine()) != null) {
                    out.append(line).append("\n");
                }
                out.flush();
            }
            InputStream tmpInputStream = new FileInputStream(outputFile);
            var result = fileStorage.upload(FileFolder.INPUT, file.getOriginalFilename(), file.getName(), tmpInputStream);
            tmpInputStream.close();
            Files.delete(tempPath);
            return result;
        } catch (final IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error occurred while uploading file: " + e.getMessage());
        }
    }

    private static BufferedReader getBufferedReader(MultipartFile file) throws IOException {
        var isr = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
        boolean isOk = true;
        while (isr.ready()) {
            // if there is a character like this �, it means that the encoding was not utf-8
            if (isr.read() == REPLACEMENT_CHAR) {
                isOk = false;
                break;
            }
        }
        String encoding = isOk ? StandardCharsets.UTF_8.toString() : "Cp1252";
        return new BufferedReader(new InputStreamReader(file.getInputStream(), encoding));
    }

    /**
     * Get the filename from url and nb slash (0 or 1)
     * Example:
     * - getFilenameFromUrl("/path/to/file.txt", 0) returns "file.txt"
     * - getFilenameFromUrl("/path/to/file.txt", 1) returns "to/file.txt"
     *
     * @param url     the url
     * @param nbSlash the number of slash present in return
     * @return the filename
     */
    public String getFilenameFromUrl(final String url, final int nbSlash) {
        String fileUrl = SanitizeUrl.removeTokenAndEncoding(url);
        final String[] split = fileUrl.split("/");
        return switch (nbSlash) {
            case 0 -> split[split.length - 1];
            case 1 -> split.length < 2 ? fileUrl : split[split.length - 2] + "/" + split[split.length - 1];
            default -> fileUrl;
        };
    }


    /**
     * Delete file for subscriber, organization, fileFolder
     *
     * @param subscriber     the subscriber
     * @param organizationId the organizationId
     * @param fileFolder     the fileFolder
     * @param fileUrl        the fileUrl
     */
    public String deleteFile(String subscriber, Long organizationId, FileFolder fileFolder, String fileUrl) {
        String fileName = getFilenameFromUrl(fileUrl, 0);
        String deletedFilePath = null;
        final FileStorage fileStorage = fileSystem.mount(subscriber, organizationId.toString());
        try {
            deletedFilePath = fileStorage.getFileUrl(fileFolder, fileName);
            fileStorage.delete(fileFolder, fileName);
        } catch (BlobStorageException e) {
            if (e.getStatusCode() == 404) {
                log.error("An error occurred during file deletion: file {} not found in storage as it should get file: {}", deletedFilePath, fileUrl);
            } else {
                log.error("An error occurred during deletion of file", e);
            }
        } catch (IOException e) {
            log.error("An error occurred during deletion of file", e);
        }
        return deletedFilePath;
    }

}
